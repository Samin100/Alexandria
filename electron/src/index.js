const { app, BrowserWindow, ipcMain, Notification, Tray } = require('electron')
const axios = require('axios').default;
const cheerio = require('cheerio');
var convert = require('xml-js');
const fs = require("fs");
const path = require('path')
const open = require('open');

const { exec } = require('child_process');




// the directory where books are stored
const booksDir = path.join(process.env.HOME, 'Alexandria')
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
        title: 'Alexandria',
        icon: __dirname + '/alexandria-logo.png',
        webPreferences: {
            nodeIntegration: true,
        }
    })

    // load the react project
    win.loadURL('http://localhost:2020/')

    // win.maximize()
    // Open the DevTools.
    win.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// making an axios requests for react
ipcMain.handle('search-libgen-nonfiction', async (event, searchQuery) => {
    let response;
    try {
        response = await axios.get(`http://libgen.is/search.php`, {
            params: {
                req: searchQuery,
                res: 50
            }
        })

    } catch (e) {
        return null
    }

    if (response.status !== 200) {
        console.log('GET request to libgen.is failed with status code ' + response.status)
        return null
    }

    const $ = cheerio.load(response.data)

    let results = $('table').eq(2).children('tbody').children()

    // removing i tags
    results = results.remove('font')

    let books = []
    results.each(function (i, row) {
        if (i === 0) {
            return
        }

        // removing the green text from the title for books that are part of a series
        $(this).children().eq(2).children('a[title]').children().each(function (j, element) {
            $(this).replaceWith('');
        })

        // creating the book object
        let book = {
            id: $(this).children().eq(0).text(),
            author: $(this).children().eq(1).text(),
            title: $(this).children().eq(2).children('a[title]').text().trim(),
            publisher: $(this).children().eq(3).text(),
            year: $(this).children().eq(4).text(),
            pages: $(this).children().eq(5).text(),
            language: $(this).children().eq(6).text(),
            size: $(this).children().eq(7).text(),
            extension: $(this).children().eq(8).text(),
            mirror1: $(this).children().eq(9).children().first().attr('href'),
            mirror2: $(this).children().eq(10).children().first().attr('href'),
        }
        books.push(book)
    })
    return books

})


ipcMain.handle('search-goodreads', async (event, searchQuery) => {
    /*
    The goodreads API is horrible. I hope I never have to use it. Ever.
    it's god awful.
    */

    axios.get(`https://www.goodreads.com/search/index.xml`, {
        params: {
            q: searchQuery,
            key: `bDs5wMREmDln2opmmM6Zag`
        }
    }).then((res) => {
        let results = JSON.parse(convert.xml2json(res.data, { compact: true, spaces: 4 }));
        let books = results.GoodreadsResponse.search.results.work


        books.forEach((book) => {
            let bookData = {
                id: book.best_book.id._text,
                ratingsCount: book.ratings_count._text,
                textReviewCount: book.textReviewCount,
                year: book.original_publication_year._text,
                averageRating: book.average_rating._text,
                title: book.best_book.title._text,
                author: book.best_book.author.name._text,
                image: book.best_book.image_url._text
            }
            console.log(bookData)

        })
    })

})


// the handler for window events 
ipcMain.handle('window-event', (event, type) => {
    // type will either be close, resize, or minimize
    console.log(type)
    if (type === 'close') {
        win.close()
    } else if (type === 'resize') {
        win.isMaximized() ? win.setSize(1280, 720, true) : win.maximize()
    } else if (type === 'minimize') {
        win.minimize()
    }
})

ipcMain.handle('download-book', (event, book) => {



    // axios.get(libgenBook.mirror1).then((res) => {
    //     const $ = cheerio.load(res.data)
    //     let url = $('h2').eq(0).children().eq(0).attr('href')
    //     console.log('mirror1 started')
    //     axios.get(url, {
    //         responseType: "stream",
    //         onDownloadProgress: (progressEvent) => {
    //             let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    //             console.log(percentCompleted)
    //         },
    //     }).then(bookRes => {
    //         console.log('mirror1 finished')
    //     })
    // })

    const { googleBook, libgenBook } = book;

    axios.get(libgenBook.mirror2).then(async (res) => {
        const $ = cheerio.load(res.data)
        let url = $('h2').eq(0).parent().attr('href')
        console.log('mirror2 started')

        const request = await axios({
            url: url,
            method: 'GET',
            responseType: 'stream'
        })

        // getting the filename from the headers
        let filename = request.headers['content-disposition'].split('filename=')[1]
        filename = filename.substr(1, filename.length - 2)

        // ensuring the books directory exists
        if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir)

        // creating the file writer
        const writer = fs.createWriteStream(path.join(booksDir, filename));
        request.data.pipe(writer)
        let error;

        writer.on('error', err => {
            error = err;
            writer.close();
        });

        writer.on('close', () => {
            if (error) {
                console.log('An error occurred while downloading')
                console.log(error)
            } else {
                console.log('done downloading! opening...')
                // open(path.join(booksDir, filename))
            }

            win.webContents.send('download-complete', {
                id: googleBook.id,
            })


        });

        // getting the file size
        const contentLength = parseInt(request.headers['content-length'])
        let downloaded = 0

        // handling chunk downloads
        request.data.on('data', (chunk) => {
            downloaded += chunk.length
            console.log(`${(downloaded / contentLength) * 100}%`)
            win.webContents.send('download-progress', {
                id: googleBook.id,
                contentLength: contentLength,
                downloaded: downloaded
            })
        })

        request.data.on('finish', () => {
            console.log('complete')
        })


        // axios.get(url, {
        //     responseType: "stream",
        //     onDownloadProgress: (progressEvent) => {
        //         let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        //         console.log(percentCompleted)
        //     },
        // }).then(bookRes => {
        //     console.log('mirror2 finished')z
        // })
    })



})