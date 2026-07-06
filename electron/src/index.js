const { app, BrowserWindow, ipcMain } = require("electron");
const axios = require("axios").default;
const fs = require("fs");
const path = require("path");
const open = require("open");
const libgen = require("./libgen");

// checking whether this is the development environment
const isDev = process.env.DEV === "true";
if (isDev) {
  console.log("development");
}

// the directory where books are stored
const booksDir = path.join(process.env.HOME, "Alexandria");
// the window object
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    minHeight: 180,
    minWidth: 320,
    width: 1920,
    height: 1080,
    frame: false,
    title: "Alexandria",
    icon: path.join(__dirname, "alexandria-logo.png"),
    webPreferences: {
      // the renderer talks to this process through window.require("electron"),
      // which needs node integration outside a sandboxed, isolated context
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    },
  });

  // load the react project
  if (isDev) {
    win.loadURL("http://localhost:2020/");
    win.webContents.openDevTools();
  } else {
    win.loadURL(
      `file://${path.join(__dirname, "./../react-build/index.html")}`
    );
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// searching libgen on behalf of the renderer
ipcMain.handle("search-libgen-nonfiction", async (event, searchQuery) => {
  return await libgen.searchLibgen(searchQuery);
});

// the handler for window events
ipcMain.handle("window-event", (event, type) => {
  // type will either be close, resize, or minimize

  if (type === "close") {
    win.close();
  } else if (type === "resize") {
    win.isMaximized() ? win.setSize(1280, 720, true) : win.maximize();
  } else if (type === "minimize") {
    win.minimize();
  }
});

ipcMain.handle("get-local-books", (event) => {
  // returns an array of the books in bookDir
  // the array is ordered by which book has been opened most recently
  if (!fs.existsSync(booksDir)) {
    return [];
  }
  let items = fs.readdirSync(booksDir);
  let books = [];
  for (let i = 0; i < items.length; i++) {
    // the book directory
    let bookDir = path.join(booksDir, items[i]);
    if (fs.lstatSync(bookDir).isDirectory()) {
      let files = fs.readdirSync(bookDir);
      let bookFileExists = false;
      let stats;
      let bookFile;
      for (let f of files) {
        if (f.endsWith(".epub") || f.endsWith(".pdf")) {
          bookFileExists = true;
          // getting the access time for this file via fs stats
          bookFile = path.join(bookDir, f);
          stats = fs.statSync(bookFile);
          break;
        }
      }
      if (bookFileExists && fs.existsSync(path.join(bookDir, "data.json"))) {
        // if the book file exists as well as data.json we add it to the books list
        // opening data.json
        let bookData = fs.readFileSync(path.join(bookDir, "data.json"));
        bookData = JSON.parse(bookData);

        books.push({
          book: bookData,
          stats: stats,
          path: bookFile,
        });
      }
    }
  }
  // sorting the books by last access time
  books.sort((a, b) => (a.stats.atime < b.stats.atime ? 1 : -1));
  return books;
});

ipcMain.handle("open-book", (event, localBook) => {
  open(localBook.path);
});

ipcMain.handle("open-books-dir", (event) => {
  // opens the directory where the books are stored
  open(booksDir);
});

ipcMain.handle("download-book", async (event, book) => {
  const { googleBook, libgenBook } = book;

  try {
    // resolving the mirror page into a direct download link
    const url = await libgen.getDownloadUrl(libgenBook.mirror1);
    if (!url) {
      throw new Error("no download link found on the mirror page");
    }

    const request = await axios({
      url: url,
      method: "GET",
      responseType: "stream",
      headers: libgen.HEADERS,
      timeout: 30000,
    });

    // getting the filename from the headers, falling back to the file's md5
    const filename = libgen.filenameFromResponse(
      request,
      `${libgenBook.md5 || libgenBook.id}.${libgenBook.extension}`
    );

    // ensuring the books directory exists
    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir);

    // the directory for this book is the title of the book and the first author's name
    let title = googleBook.volumeInfo.title;
    title = googleBook.volumeInfo.authors
      ? `${title} - ${googleBook.volumeInfo.authors[0]}`
      : title;
    let bookDir = path.join(booksDir, libgen.sanitizeFilename(title));

    // creating the directory for this book
    if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir);

    // writing out the book's metadata JSON blob inside of bookDir
    let bookData = JSON.stringify(googleBook);
    fs.writeFileSync(path.join(bookDir, "data.json"), bookData);

    // downloading this book's cover image if it exists
    if (googleBook.volumeInfo?.imageLinks?.thumbnail) {
      // getting the cover URL
      let imgUrl = googleBook.volumeInfo.imageLinks.thumbnail;
      // creating the img request
      const imgRequest = await axios({
        url: imgUrl,
        method: "GET",
        responseType: "stream",
      });
      // writer to save the image file
      const imgWriter = fs.createWriteStream(path.join(bookDir, "cover.jpg"));
      imgRequest.data.pipe(imgWriter);
      imgWriter.on("error", (err) => {
        console.log("Error while saving book cover image:");
        console.log(err);
        imgWriter.close();
      });
    }

    // creating the file writer
    const writer = fs.createWriteStream(path.join(bookDir, filename));
    request.data.pipe(writer);
    let error;

    writer.on("error", (err) => {
      error = err;
      console.log({ err });
      writer.close();
    });

    writer.on("close", () => {
      if (error) {
        console.log("An error occurred while downloading");
        console.log(error);
        win.webContents.send("download-error", {
          id: googleBook.id,
          message: error.message,
        });
        return;
      }

      win.webContents.send("download-complete", {
        id: googleBook.id,
      });
    });

    let downloaded = 0;
    // handling chunk downloads
    request.data.on("data", (chunk) => {
      downloaded += chunk.byteLength;
      win.webContents.send("download-progress", {
        id: googleBook.id,
        downloaded: downloaded,
      });
    });
  } catch (e) {
    console.log("download failed:", e.message);
    win.webContents.send("download-error", {
      id: googleBook.id,
      message: e.message,
    });
  }
});
