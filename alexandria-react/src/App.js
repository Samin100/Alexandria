import React, { Component } from "react";
import axios from "axios";
import moment from "moment";
import { motion } from "framer-motion";
import { GiBookshelf } from "react-icons/gi";
import { debounce, deburr, uniqBy } from "lodash";
import SpinnerBlack from "./spinner-black.svg";
import SplitPane from "react-split-pane";
import { Line } from "rc-progress";
import downloadCompleteSound from "./unconvinced.mp3";

// loading electron from the window to access IpcRenderer
const electron = window.require("electron");
const ipcRenderer = electron.ipcRenderer;

const bytesToString = (bytes) => {
  // converts an integer bytes into a human readable string
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (
    (bytes / Math.pow(1024, i)).toFixed(2) * 1 +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchBox: "",
      searchResults: [],
      selectedBook: null,
      activeTab: "search",
      downloads: [],
      localBooks: null,
    };
    this.fetchGoogleBooksDebounced = debounce(this.fetchGoogleBooks, 300);
  }

  componentDidMount() {
    this.ePub = window.ePub;

    // updating the local books
    this.updateLocalBooks();

    ipcRenderer.on("download-progress", (event, message) => {
      // the event handler for updating download progress

      let newDownloads = [];
      for (let download of this.state.downloads) {
        if (message.id === download.id) {
          newDownloads.push({
            ...download,
            downloaded: message.downloaded,
          });
        } else {
          newDownloads.push(download);
        }
      }

      this.setState({ downloads: newDownloads });
    });

    ipcRenderer.on("download-complete", (event, message) => {
      // the event handler for setting a download as complete

      let newDownloads = [];
      // removing the download from the list
      this.state.downloads.forEach((download) => {
        if (download.id !== message.id) {
          newDownloads.push(download);
        } else {
          // creating a notification
          let notifTitle = download.googleBook.volumeInfo.title;
          var audio = new Audio(downloadCompleteSound);
          audio.play();
          let finishedNotification = new Notification(notifTitle, {
            body: `Download complete.`,
            sound: false,
            silent: true,
            icon: download.googleBook.volumeInfo?.imageLinks?.thumbnail,
          });

          finishedNotification.onclick = () => {
            // opening the book when the notification is clicked
            for (let localBook of this.state.localBooks) {
              if (message.id === localBook.book.id) {
                this.onLocalBookClick(localBook);
                break;
              }
            }
            console.log(download.googleBook);
          };
        }
      });
      this.setState({ downloads: newDownloads });
      this.updateLocalBooks();
    });

    axios
      .get(`https://www.googleapis.com/books/v1/volumes`, {
        params: {
          q: '"Stripe Press"',
        },
      })
      .then((res) => {
        this.setState({ searchResults: res.data.items });
      });
  }

  updateLocalBooks = () => {
    // calling this function will update the localBooks value of state
    ipcRenderer.invoke("get-local-books").then((books) => {
      this.setState({ localBooks: books });
      console.log(books);
    });
  };

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab, selectedBook: null });

    if (tab === "bookshelf") {
      // then we get the local books
      this.updateLocalBooks();
    }
  };

  onSearchBoxChange = (e) => {
    this.setState({ searchBox: e.target.value });
    if (e.target.value.trim() === "") {
      this.setState({ searchResults: null, selectedBook: null });
    }

    this.fetchGoogleBooksDebounced(e.target.value);
  };

  fetchGoogleBooks = (searchTerm) => {
    if (!searchTerm.trim()) {
      // if the string is empty, we return
      return;
    }

    // populating api_data with an initial search
    axios
      .get(`https://www.googleapis.com/books/v1/volumes`, {
        params: {
          q: searchTerm,
        },
      })
      .then((res) => {
        if (this.state.searchBox === searchTerm) {
          if (res.data.items) {
            if (res.data.items.length > 0) {
              // removing non-unique results
              let uniqueResults = uniqBy(res.data.items, "id");

              this.setState({
                searchResults: uniqueResults,
                selectedBook: res.data.items[0],
              });
              console.log(res.data.items);
              this.FetchLibgenSearchResults(res.data.items[0]);
            } else {
              // if there are no results we clear the results
              this.setState({ searchResults: [], selectedBook: null });
            }
          }
        }
      });
  };

  onLibgenResultClick = (libgenResult, googleBook) => {
    // when the user clicks a download link

    // updating state with this book being downloaded
    let bookDownload = {
      libgenResult: libgenResult,
      googleBook: googleBook,
      status: "getting-download-page",
      id: googleBook.id,
    };
    this.setState({
      downloads: [this.state.downloads, bookDownload],
    });

    ipcRenderer.invoke("download-book", {
      libgenBook: libgenResult,
      googleBook: this.state.selectedBook,
    });
  };

  onBookRowClick = (book) => {
    if (this.state.selectedBook?.id === book.id) {
      this.setState({ selectedBook: null });
    } else {
      this.setState({ selectedBook: book });
      this.FetchLibgenSearchResults(book);
    }
  };

  onLocalBookClick = (localBook) => {
    // when a local book is clicked
    ipcRenderer.invoke("open-book", localBook);
  };

  handleLibgenSearchResults = (searchResults, selectedBook) => {
    console.log(searchResults);

    let matches = [];

    searchResults.forEach((book, index) => {
      // only allowing epubs and pdfs
      let supportedExtensions = ["epub", "pdf"];
      if (!supportedExtensions.includes(book.extension.toLowerCase())) {
        return;
      }

      // normalizing the google title by trimming, deburring, and removing parenthesis
      let googleTitle = deburr(selectedBook.volumeInfo.title);
      let libgenTitle = deburr(book.title);
      // removing parenthesis and brackets
      libgenTitle = libgenTitle.replace(/(\[.*?\])/g, "");
      libgenTitle = libgenTitle.replace(/(\(.*?\))/g, "");
      googleTitle = googleTitle.replace(/(\[.*?\])/g, "");
      googleTitle = googleTitle.replace(/(\(.*?\))/g, "");

      // trimming the titles and lowercasing
      libgenTitle = libgenTitle.trim().toLowerCase();
      googleTitle = googleTitle.trim().toLowerCase();

      // only showing matches that have the same year
      let googleYear = moment(selectedBook.volumeInfo.publishedDate).year();
      let libgenYear = parseInt(book.year);

      matches.push(book);
    });

    if (this.state.searchResults) {
      // updating the results
      this.setState({
        searchResults: this.state.searchResults.map((item, index) => {
          if (item.id === selectedBook.id) {
            return {
              ...item,
              libgenMatches: matches,
              searching: false,
            };
          }
          return item;
        }),
      });
    }
  };

  FetchLibgenSearchResults = (book) => {
    // if a book already has libgen matches then we return
    // or if a search has already began
    if (book.searching || Array.isArray(book.libgenMatches) || !book) return;

    // showing the `searching` spinner at the bottom of the page
    this.setState({
      searchResults: this.state.searchResults.map((item, index) => {
        if (book.id === item.id) {
          return {
            ...item,
            searching: true,
          };
        }
        return item;
      }),
    });

    // creating the libgen search query for the book
    let searchQuery = book.volumeInfo.title;
    // if the book has a subtitle, we append it
    searchQuery = book.volumeInfo.subtitle
      ? searchQuery + ` ` + book.volumeInfo.subtitle
      : searchQuery;
    // appending the first author's name to the query
    searchQuery =
      searchQuery +
      ` ${book.volumeInfo.authors ? book.volumeInfo.authors : ``}`;

    // sending the query to the main process to make the request for us
    ipcRenderer
      .invoke("search-libgen-nonfiction", searchQuery)
      .then((results) => {
        if (!results) {
          this.setState({
            searchResults: this.state.searchResults.map((item, index) => {
              if (item.id === book.id) {
                return {
                  ...item,
                  searching: false,
                };
              }
              return item;
            }),
          });
        } else if (results.length === 0) {
          // if there are no results we retry with a broader query by removing the book's description
          // retrying with a broader search query by removing the book's description
          // we keep the first author's name in the query
          searchQuery =
            book.volumeInfo.title +
            ` ${book.volumeInfo.authors ? book.volumeInfo.authors[0] : ``}`;
          ipcRenderer
            .invoke("search-libgen-nonfiction", book.volumeInfo.title)
            .then((results) => {
              this.handleLibgenSearchResults(results, book);
            });
        } else {
          this.handleLibgenSearchResults(results, book);
        }
      });
  };

  NoCoverImage = (height, width, fontSize) => {
    return (
      <div
        style={{
          backgroundColor: `#eee`,
          minHeight: height ? height : width / 3,
          minWidth: width ? width : `100%`,
          marginRight: 20,
          objectFit: "contain",
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
        }}
      >
        <p
          style={{
            flex: 1,
            alignSelf: "center",
            justifyContent: "center",
            color: "grey",
            fontSize: fontSize,
            textAlign: "center",
          }}
        >
          No cover
        </p>
      </div>
    );
  };

  SearchResults = (props) => {
    if (!this.state.searchResults) {
      return null;
    }

    const BookRows = this.state.searchResults.map((item, index) => {
      const isSelected = this.state.selectedBook?.id === item.id;

      const variants = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0, transition: { delay: index * 0.03 } },
      };

      return (
        <motion.div
          className="noSelect search-result-book-row"
          initial="initial"
          animate="animate"
          variants={variants}
          onClick={() => this.onBookRowClick(item)}
          data-index={index}
          key={item.id}
          transition={{ duration: 0 }}
          style={{
            display: "flex",
            paddingTop: 10,
            paddingBottom: 10,
            backgroundColor: isSelected
              ? "rgba(0,100,255,0.05)"
              : "rgba(255,255,255,1)",
            border: isSelected
              ? `2px solid deepskyblue`
              : `2px solid transparent`,
            borderBottom: isSelected
              ? `2px solid deepskyblue`
              : `2px solid #eee`,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          {item.volumeInfo.imageLinks ? (
            <img
              alt=""
              className="noSelect"
              src={
                item.volumeInfo.imageLinks
                  ? item.volumeInfo.imageLinks.thumbnail
                  : null
              }
              style={{
                marginRight: 20,
                objectFit: "contain",
                alignSelf: "flex-start",
                height: 100,
              }}
            />
          ) : (
            this.NoCoverImage(100, 70, 17)
          )}
          <div className="noSelect" style={{}}>
            <p
              style={{
                fontWeight: "bold",
              }}
            >
              {item.volumeInfo.title}
              {item.volumeInfo.subtitle
                ? ": " + item.volumeInfo.subtitle
                : null}
            </p>

            <p
              style={{
                color: "grey",
                fontSize: 14,
                marginTop: 5,
              }}
            >
              {item.volumeInfo.authors
                ? item.volumeInfo.authors.join(", ")
                : "Author Unavailable"}
            </p>

            <p
              style={{
                color: "grey",
                fontSize: 14,
              }}
            >
              {moment(item.volumeInfo.publishedDate).year()}
            </p>
          </div>
        </motion.div>
      );
    });
    return BookRows;
  };

  SelectedBook = (props) => {
    if (!this.state.selectedBook) {
      return null;
    }

    // getting the current book
    let book;
    for (let i = 0; i < this.state.searchResults.length; i++) {
      let b = this.state.searchResults[i];
      if (b.id === this.state.selectedBook.id) {
        book = b;
      }
    }
    if (!book) return;

    const variants = {
      initial: { opacity: 0, scale: 1, y: 200 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 300 * 0.001 },
      },
    };

    // determining whether this book is already being downloaded
    let isDownloading = false;
    let bookDownload;
    for (let download of this.state.downloads) {
      if (download.id === this.state.selectedBook.id) {
        // if this book is in the downloads
        bookDownload = download;
        isDownloading = true;
        break;
      }
    }

    // checking if this book already exists in the user's local library
    let bookAlreadyDownloaded;
    for (let localBook of this.state.localBooks) {
      if (this.state.selectedBook.id === localBook.book.id) {
        bookAlreadyDownloaded = localBook;
        break;
      }
    }

    let BookStatusBar;

    if (bookAlreadyDownloaded) {
      BookStatusBar = (
        <div
          style={{
            position: "absolute",
            alignSelf: "flex-end",
            justifyContent: "flex-end",
            display: "flex",
            bottom: 0,
            right: 0,
            overflow: "hidden",
            borderRadius: 4,
          }}
        >
          <motion.div
            key={book.id}
            variants={variants}
            initial="initial"
            animate="animate"
            onClick={() => this.onLocalBookClick(bookAlreadyDownloaded)}
            style={{
              backgroundColor: "dodgerblue",
              border: `1px solid lightgrey`,
              boxShadow: "0px 0px 8px lightgrey",
              borderRadius: 4,
              padding: 20,
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            <p
              style={{
                color: "white",
                padding: 5,
                fontWeight: "bold",
              }}
            >
              Open {this.state.selectedBook.volumeInfo.title}
            </p>
          </motion.div>
        </div>
      );
    } else if (isDownloading) {
      let downloadText;
      let percent = 0;
      const sizeString = book.libgenMatches[0].size.toLowerCase().trim();
      const number = parseInt(sizeString.split(" ")[0]);
      const unit = sizeString.split(" ")[1].trim();
      let sizeBytes = 0;
      if (unit === "kb") {
        sizeBytes = number * 1024;
      } else if (unit === "mb") {
        sizeBytes = number * 1024 * 1024;
      } else if (unit === "gb") {
        sizeBytes = number * 1024 * 1024 * 1024;
      }
      if (!bookDownload.downloaded) {
        downloadText = "Starting download...";
      } else {
        downloadText = `Downloaded ${bytesToString(
          bookDownload.downloaded
        )} / ${bytesToString(sizeBytes)} `;
        percent = (bookDownload.downloaded / sizeBytes) * 100;
      }

      BookStatusBar = (
        <div
          style={{
            position: "absolute",
            alignSelf: "flex-end",
            justifyContent: "flex-end",
            display: "flex",
            bottom: 0,
            right: 0,
            overflow: "hidden",
            borderRadius: 4,
          }}
        >
          <motion.div
            key={book.id}
            variants={variants}
            initial="initial"
            animate="animate"
            style={{
              backgroundColor: "#eee",
              border: `1px solid lightgrey`,
              boxShadow: "0px 0px 8px lightgrey",
              borderRadius: 4,
              padding: 20,
              paddingTop: 10,
              paddingBottom: 10,
              minWidth: 440,
              maxWidth: 440,
            }}
          >
            <p
              style={{
                alignSelf: "center",
                fontSize: 16,
              }}
            >
              {Math.floor(percent)}%
            </p>
            <Line percent={percent} strokeWidth="1" strokeColor="deepskyblue" />
            <p
              style={{
                alignSelf: "center",
                fontSize: 14,
              }}
            >
              {downloadText}
            </p>
          </motion.div>
        </div>
      );
    } else if (book.searching) {
      BookStatusBar = (
        <div
          style={{
            position: "absolute",
            alignSelf: "flex-end",
            justifyContent: "flex-end",
            display: "flex",
            bottom: 0,
            right: 0,
            overflow: "hidden",
            borderRadius: 4,
          }}
        >
          <motion.div
            key={book.id}
            variants={variants}
            initial="initial"
            animate="animate"
            style={{
              backgroundColor: "#eee",
              border: `1px solid lightgrey`,
              boxShadow: "0px 0px 8px lightgrey",
              borderRadius: 4,
              padding: 20,
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignSelf: "center",
              }}
            >
              <img
                alt=""
                src={SpinnerBlack}
                height={15}
                width={15}
                style={{
                  marginRight: 10,
                  alignSelf: "center",
                }}
              />
              <p
                style={{
                  alignSelf: "center",
                }}
              >
                Loading sources...
              </p>
            </div>
          </motion.div>
        </div>
      );
    } else if (book.libgenMatches) {
      let MatchRows = book.libgenMatches.map((match, index) => {
        // the rows of libgen results that match the selected book
        return (
          <motion.div
            onClick={() =>
              this.onLibgenResultClick(match, this.state.selectedBook)
            }
            whileHover={{
              backgroundColor: "white",
            }}
            key={match.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop:
                index === 0 ? `2px solid lightgrey` : `1px solid lightgrey`,
              padding: 20,
              paddingTop: 5,
              paddingBottom: 5,
              backgroundColor: "#eee",
            }}
          >
            <div
              style={{
                marginRight: 15,
              }}
            >
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: 14,
                }}
              >
                {match.title}
              </p>
              <p
                style={{
                  fontSize: 14,
                }}
              >
                {match.author}
              </p>
            </div>

            <div
              style={{
                justifyContent: "flex-end",
                alignSelf: "flex-start",
                minWidth: 60,
              }}
            >
              <p
                style={{
                  fontWeight: "bold",
                  textAlign: "right",
                  fontSize: 14,
                }}
              >
                {match.extension}
              </p>
              <p
                style={{
                  textAlign: "right",
                  fontSize: 14,
                }}
              >
                {match.size}
              </p>
            </div>
          </motion.div>
        );
      });
      BookStatusBar = (
        <motion.div
          variants={variants}
          initial="initial"
          animate="animate"
          style={{
            position: "absolute",
            maxWidth: 440,
            minWidth: 440,
            alignSelf: "flex-end",
            justifyContent: "flex-end",
            display: "flex",
            bottom: 0,
            right: 15,
            maxHeight: `50vh`,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            // overflowY: 'scroll',
            overflowX: "hidden",
            border: `1px solid lightgrey`,
          }}
        >
          <div
            style={{
              backgroundColor: "#eee",
              width: "100%",
              boxShadow: "0px 0px 8px lightgrey",
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignSelf: "center",
                flexDirection: "column",
                width: "100%",
              }}
            >
              {MatchRows.length > 0 ? (
                <>
                  <div
                    style={{
                      padding: 15,
                      paddingTop: 10,
                      paddingBottom: 10,
                      display: "flex",
                      backgroundColor: "#eee",
                    }}
                  >
                    <h4>Available versions:</h4>
                  </div>
                  {MatchRows}
                </>
              ) : (
                <div
                  style={{
                    padding: 15,
                    paddingTop: 10,
                    paddingBottom: 10,
                    display: "flex",
                    backgroundColor: "#eee",
                  }}
                >
                  <h4>This book was not found (◞‸◟；)</h4>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          padding: 40,
          paddingRight: 30,
          paddingLeft: 30,
          paddingBottom: `calc(50vh + 30px)`,
          overflow: "hidden",
        }}
      >
        {BookStatusBar}
        <div
          style={{
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {book.volumeInfo.imageLinks ? (
            <img
              alt=""
              className="book-img"
              src={
                book.volumeInfo.imageLinks
                  ? book.volumeInfo.imageLinks.thumbnail
                  : null
              }
              style={{
                marginRight: 20,
                objectFit: "contain",
                minWidth: 180,
                alignSelf: "flex-start",
                justifyContent: "center",
              }}
            />
          ) : (
            <div
              style={{
                marginRight: 20,
                objectFit: "contain",
                minWidth: 180,
                alignSelf: "flex-start",
              }}
            >
              {this.NoCoverImage(250, 170, 18)}
            </div>
          )}
          {book.searching ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <img
                alt=""
                src={SpinnerBlack}
                height={15}
                width={15}
                style={{
                  marginRight: 15,
                  alignSelf: "center",
                }}
              />
              <p
                style={{
                  marginTop: 5,
                }}
              >
                Loading sources...
              </p>
            </div>
          ) : null}
        </div>
        <div
          style={{
            maxWidth: 600,
          }}
        >
          <p
            style={{
              fontWeight: "bold",
              fontSize: 22,
              userSelect: "text",
            }}
          >
            {book.volumeInfo.title}
            {book.volumeInfo.subtitle ? ": " + book.volumeInfo.subtitle : null}
          </p>

          <p
            style={{
              color: "grey",
              userSelect: "text",
            }}
          >
            {book.volumeInfo.authors
              ? book.volumeInfo.authors.join(", ")
              : "Author Unavailable"}
          </p>

          <p
            style={{
              color: "grey",
              marginTop: 3,
              userSelect: "text",
            }}
          >
            {moment(book.volumeInfo.publishedDate).year()}
          </p>

          <p
            style={{
              marginTop: 20,
              marginBottom: 20,
              userSelect: "text",
            }}
          >
            {book.volumeInfo.description}
          </p>

          {book.volumeInfo.categories ? (
            <>
              <p
                style={{
                  marginTop: 20,
                  fontWeight: "bold",
                  color: "grey",
                }}
              >
                Tags
              </p>
              <p
                style={{
                  marginBottom: 20,
                  userSelect: "text",
                }}
              >
                {book.volumeInfo.categories?.join(",")}
              </p>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  LocalBooksResults = (props) => {
    if (!this.state.localBooks) {
      return null;
    } else if (this.state.localBooks.length === 0) {
      return (
        <p
          style={{
            padding: 10,
            paddingLeft: 20,
          }}
        >
          Search for a book to add it to your library!
        </p>
      );
    }

    const BookRows = this.state.localBooks.map((localBook, index) => {
      const isSelected = this.state.selectedBook?.id === localBook.book.id;
      let book = localBook.book.volumeInfo;

      const variants = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0, transition: { delay: index * 0.03 } },
      };

      return (
        <motion.div
          transition={{ duration: 0 }}
          className="noSelect local-book-item"
          initial="initial"
          animate="animate"
          variants={variants}
          onClick={() => this.onLocalBookClick(localBook)}
          data-index={index}
          key={`local-${localBook.book.id}`}
          whileHover={{
            scale: 1.02,
            transition: { duration: 0.2 },
          }}
          whileTap={{
            backgroundColor: "rgba(0,100,255,.1)",
          }}
          style={{
            display: "flex",
            paddingTop: 10,
            paddingBottom: 10,
            backgroundColor: "white",
            boxShadow: "6px 6px rgba(0,100,255,.1)",
            paddingLeft: 20,
            paddingRight: 20,
            maxWidth: 420,
            minWidth: 420,
            margin: 15,
            borderRadius: 8,
          }}
        >
          {book.imageLinks ? (
            <img
              alt=""
              className="noSelect"
              src={book.imageLinks ? book.imageLinks.thumbnail : null}
              style={{
                marginRight: 20,
                objectFit: "contain",
                alignSelf: "flex-start",
                height: 100,
              }}
            />
          ) : (
            this.NoCoverImage(100, 70, 17)
          )}
          <div className="noSelect" style={{}}>
            <p
              style={{
                fontWeight: "bold",
              }}
            >
              {book.title}
              {book.subtitle ? ": " + book.subtitle : null}
            </p>

            <p
              style={{
                color: "grey",
                fontSize: 14,
                marginTop: 5,
              }}
            >
              {book.authors ? book.authors.join(", ") : "Author Unavailable"}
            </p>

            <p
              style={{
                color: "grey",
                fontSize: 14,
              }}
            >
              {moment(book.publishedDate).year()}
            </p>
          </div>
        </motion.div>
      );
    });
    return BookRows;
  };

  ereader = () => {
    return <div id="ereader"></div>;
  };

  MainArea = (props) => {
    if (this.state.activeTab === "search") {
      return (
        <SplitPane
          split="vertical"
          primary="first"
          allowResize={true}
          defaultSize={450}
        >
          <div
            style={{
              overflow: "scroll",
              maxHeight: "100vh",
              minHeight: "100vh",
              position: "relative",
              borderRight: `1px solid lightgrey`,
            }}
          >
            <div
              style={{
                padding: 10,
                borderBottom: `2px solid #eee`,
                position: "absolute",
                width: "100%",
                backgroundColor: "white",
                height: 60,
              }}
            >
              <input
                autofocus={true}
                className="noSelect"
                placeholder="Enter a book title or author"
                type="search"
                onChange={this.onSearchBoxChange}
                value={this.state.searchBox}
                style={{
                  border: "1px solid lightgrey",
                  padding: 10,
                  width: "100%",
                  background: "#eee",
                  borderRadius: 8,
                }}
              />
            </div>
            <div
              style={{
                paddingTop: 60,
              }}
            >
              {this.SearchResults()}
            </div>
          </div>

          <div
            style={{
              height: "100vh",
              overflowX: "hidden",
              overflowY: "scroll",
            }}
          >
            {this.SelectedBook()}
          </div>
        </SplitPane>
      );
    } else if (this.state.activeTab === "bookshelf") {
      return (
        <div
          style={{
            overflow: "scroll",
            maxHeight: "100vh",
            minHeight: "100vh",
            position: "relative",
            borderRight: `1px solid lightgrey`,
            background: "#eee",
          }}
        >
          <div
            style={{
              paddingTop: 20,
              paddingLeft: 20,
              paddingBottom: 10,
              borderBottom: `2px solid #eee`,
            }}
          >
            <h3 style={{}}>My Bookshelf</h3>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {this.LocalBooksResults()}
          </div>
        </div>
      );
    }
  };

  Sidebar = (props) => {
    return (
      <div
        style={{
          background: "#222",
          minHeight: "100%",
          margin: 0,
          padding: 0,
          overflowX: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <div
          className="window-button-container drag-handle"
          style={{
            paddingTop: 10,
            paddingLeft: 10,
            display: "flex",
            paddingBottom: 10,
            position: "absolute",
            width: `100%`,
          }}
        >
          <div
            onClick={() => ipcRenderer.invoke("window-event", "close")}
            className="window-button"
            style={{
              height: 13,
              width: 13,
              background: "#FF605C",
              borderRadius: "50%",
              marginRight: 8,
              overflow: "hidden",
            }}
          ></div>
          <div
            onClick={() => ipcRenderer.invoke("window-event", "minimize")}
            style={{
              height: 13,
              width: 13,
              background: "#FFBD44",
              borderRadius: "50%",
              marginRight: 8,
            }}
          ></div>
          <div
            onClick={() => ipcRenderer.invoke("window-event", "resize")}
            style={{
              height: 13,
              width: 13,
              background: "#00CA4E",
              borderRadius: "50%",
              marginRight: 9,
            }}
          ></div>
        </div>
        <p
          style={{
            marginTop: 50,
          }}
        ></p>
        <p
          onClick={() => this.setActiveTab("search")}
          style={{
            padding: 5,
            paddingLeft: 20,
            paddingRight: 20,
            backgroundColor:
              this.state.activeTab === "search"
                ? `rgba(0,0,255,.4)`
                : `transparent`,
            color: "white",
            alignSelf: "center",
            fontSize: 14,
            userSelect: "none",
          }}
        >
          🔎 &nbsp;Get book
        </p>

        <p
          onClick={() => this.setActiveTab("bookshelf")}
          style={{
            padding: 5,
            paddingLeft: 20,
            paddingRight: 20,
            backgroundColor:
              this.state.activeTab === "bookshelf"
                ? `rgba(0,0,255,.4)`
                : `transparent`,
            color: "white",
            alignSelf: "center",
            fontSize: 14,
            userSelect: "none",
          }}
        >
          📚&nbsp; My Bookshelf
        </p>

        <motion.p
          whileHover={{
            color: "rgba(255,255,255,1)",
          }}
          onClick={() => ipcRenderer.invoke("open-books-dir")}
          style={{
            position: "absolute",
            bottom: 0,
            marginBottom: 10,
            padding: 5,
            paddingLeft: 20,
            paddingRight: 20,
            backgroundColor: "transparent",
            color: "rgba(255,255,255,.7)",
            alignSelf: "center",
            fontSize: 14,
            userSelect: "none",
          }}
        >
          📁 Open Storage Directory
        </motion.p>
      </div>
    );
  };

  render() {
    return (
      <div
        className="main-container"
        style={{
          display: "flex",
          flexDirection: "row",
          overflowY: "hidden",
          overflowX: "hidden",
          minHeight: "100%",
          minWidth: "100%",
          position: "absolute",
          margin: 0,
          padding: 0,
        }}
      >
        <SplitPane
          split="vertical"
          primary="first"
          allowResize={true}
          defaultSize={250}
        >
          <this.Sidebar />
          <this.MainArea />
        </SplitPane>
      </div>
    );
  }
}

export default App;
