import React, { Component } from 'react';
import axios from 'axios'
import moment from 'moment'
import { motion } from "framer-motion"
import { GiBookshelf } from "react-icons/gi";
import { debounce, deburr, uniqBy } from 'lodash'
import SpinnerBlack from './spinner-black.svg'
import SplitPane from 'react-split-pane'
import { Line } from 'rc-progress';
import downloadCompleteSound from './unconvinced.mp3'



const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;



const bytesToString = (bytes) => {
  // converts an integer bytes into a human readable string 
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};



class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      searchBox: '',
      searchResults: [],
      selectedBook: null,
      activeTab: 'search',
      downloads: []
    }
    this.fetchGoogleBooksDebounced = debounce(this.fetchGoogleBooks, 300)
  }


  componentDidMount() {

    ipcRenderer.on('download-progress', (event, message) => {
      // the event handler for updating download progress
      console.log(message)

      let newDownloads = []
      for (let download of this.state.downloads) {
        if (message.id === download.id) {
          newDownloads.push({
            ...download,
            contentLength: message.contentLength,
            downloaded: message.downloaded
          })
        } else {
          newDownloads.push(download)
        }
      }

      this.setState({ downloads: newDownloads })
    })

    ipcRenderer.on('download-complete', (event, message) => {
      // the event handler for setting a download as complete



      let newDownloads = []
      // removing the download from the list
      this.state.downloads.forEach(download => {
        if (download.id !== message.id) {
          newDownloads.push(download)
        } else {
          // creating a notification
          let notifTitle = download.googleBook.volumeInfo.title
          var audio = new Audio(downloadCompleteSound);
          audio.play();
          let finishedNotification = new Notification(notifTitle, {
            body: `Download complete.`,
            sound: false,
            silent: true,
            icon: download.googleBook.volumeInfo?.imageLinks?.thumbnail
          })

          finishedNotification.onclick = () => {
            console.log('notification clicked')
            // TODO: open this book in the ebook reader
            console.log(download.googleBook)
          }
        }
      })

      this.setState({ downloads: newDownloads })
    })

    axios.get(`https://www.googleapis.com/books/v1/volumes`, {
      params: {
        q: 'ron chernow'
      }
    }).then((res) => {
      this.setState({ searchResults: res.data.items })
    })
  }

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab })
  }

  onSearchBoxChange = (e) => {
    this.setState({ searchBox: e.target.value })
    if (e.target.value.trim() === '') {
      this.setState({ searchResults: null, selectedBook: null })
    }

    this.fetchGoogleBooksDebounced(e.target.value)
  }

  fetchGoogleBooks = (searchTerm) => {

    if (!searchTerm.trim()) {
      // if the string is empty, we return
      return
    }


    // populating api_data with an initial search
    axios.get(`https://www.googleapis.com/books/v1/volumes`, {
      params: {
        q: searchTerm
      }
    }).then((res) => {
      if (this.state.searchBox === searchTerm) {
        if (res.data.items) {
          if (res.data.items.length > 0) {

            // removing non-unique results
            let uniqueResults = uniqBy(res.data.items, 'id')

            this.setState({ searchResults: uniqueResults, selectedBook: res.data.items[0] })
            this.FetchLibgenSearchResults(res.data.items[0])
          } else {
            // if there are no results we clear the results
            this.setState({ searchResults: [], selectedBook: null })
          }
        }
      }

    })
  }

  onLibgenResultClick = (libgenResult, googleBook) => {
    // when the user clicks a download link

    // updating state with this book being downloaded
    let bookDownload = {
      libgenResult: libgenResult,
      googleBook: googleBook,
      status: 'getting-download-page',
      id: googleBook.id
    }
    this.setState({
      downloads: [
        this.state.downloads,
        bookDownload
      ]
    })

    console.log(bookDownload)

    ipcRenderer.invoke('download-book', {
      libgenBook: libgenResult,
      googleBook: this.state.selectedBook
    }).then((res) => {
      console.log(res)
    })
  }

  onBookRowClick = (book) => {
    if (this.state.selectedBook?.id === book.id) {
      this.setState({ selectedBook: null })
    } else {
      this.setState({ selectedBook: book })
      this.FetchLibgenSearchResults(book)
    }
  }

  handleLibgenSearchResults = (searchResults, selectedBook) => {
    console.log(searchResults)

    let matches = []

    searchResults.forEach((book, index) => {

      // only allowing epubs and pdfs
      let supportedExtensions = ['epub', 'pdf', 'mobi']
      if (!supportedExtensions.includes(book.extension.toLowerCase())) {
        return
      }

      // normalizing the google title by trimming, deburring, and removing parenthesis
      let googleTitle = deburr(selectedBook.volumeInfo.title)
      let libgenTitle = deburr(book.title)
      // removing parenthesis and brackets
      libgenTitle = libgenTitle.replace(/(\[.*?\])/g, '')
      libgenTitle = libgenTitle.replace(/(\(.*?\))/g, '')
      googleTitle = googleTitle.replace(/(\[.*?\])/g, '')
      googleTitle = googleTitle.replace(/(\(.*?\))/g, '')

      // trimming the titles and lowercasing
      libgenTitle = libgenTitle.trim().toLowerCase()
      googleTitle = googleTitle.trim().toLowerCase()

      // only showing matches that have the same year
      let googleYear = moment(selectedBook.volumeInfo.publishedDate).year()
      let libgenYear = parseInt(book.year)

      matches.push(book)
    })

    if (this.state.searchResults) {
      // updating the results 
      this.setState({
        searchResults: this.state.searchResults.map((item, index) => {
          if (item.id === selectedBook.id) {
            return {
              ...item,
              libgenMatches: matches,
              searching: false,
            }
          }
          return item
        })
      })
    }
  }

  FetchLibgenSearchResults = (book) => {


    console.log('searching libgen for', book.volumeInfo.title)

    // if a book already has libgen matches then we return
    // or if a search has already began
    if (book.searching || Array.isArray(book.libgenMatches) || !book) return


    // showing the `searching` spinner at the bottom of the page
    this.setState({
      searchResults: this.state.searchResults.map((item, index) => {
        if (book.id === item.id) {
          return {
            ...item,
            searching: true
          }
        }
        return item
      })
    })

    // creating the libgen search query for the book
    let searchQuery = book.volumeInfo.title
    // if the book has a subtitle, we append it
    searchQuery = book.volumeInfo.subtitle ? searchQuery + ` ` + book.volumeInfo.subtitle : searchQuery
    // appending the first author's name to the query
    searchQuery = searchQuery + ` ${book.volumeInfo.authors ? book.volumeInfo.authors : ``}`

    console.log(searchQuery)

    // sending the query to the main process to make the request for us
    ipcRenderer.invoke('search-libgen-nonfiction', searchQuery).then((results) => {

      if (!results) {
        this.setState({
          searchResults: this.state.searchResults.map((item, index) => {
            if (item.id === book.id) {
              return {
                ...item,
                searching: false,
              }
            }
            return item
          })
        })
      } else if (results.length === 0) {
        // if there are no results we retry with a broader query by removing the book's description
        // retrying with a broader search query by removing the book's description
        // we keep the first author's name in the query
        searchQuery = book.volumeInfo.title + ` ${book.volumeInfo.authors ? book.volumeInfo.authors[0] : ``}`
        console.log(searchQuery)
        ipcRenderer.invoke('search-libgen-nonfiction', book.volumeInfo.title).then((results) => {
          this.handleLibgenSearchResults(results, book)
        })
      } else {
        this.handleLibgenSearchResults(results, book)
      }
    })
  }

  NoCoverImage = (props) => {
    return (
      <div style={{
        backgroundColor: `#eee`,
        minHeight: props.height ? props.height : props.width / 3,
        minWidth: props.width ? props.width : `100%`,
        marginRight: 20,
        objectFit: 'contain',
        alignSelf: 'flex-start',
        display: 'flex',
        alignItems: 'center'
      }}>
        <p style={{
          flex: 1,
          alignSelf: 'center',
          justifyContent: 'center',
          color: 'grey',
          fontSize: props.fontSize,
          textAlign: 'center'
        }}>No cover</p>
      </div>
    )
  }


  SearchResults = (props) => {

    if (!this.state.searchResults) {
      return null
    }

    const BookRows = this.state.searchResults.map((item, index) => {
      const isSelected = this.state.selectedBook?.id === item.id

      const variants = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0, transition: { delay: index * .03 } }
      }

      return (
        <motion.div
          className="noSelect"
          initial='initial'
          animate='animate'
          variants={variants}
          onClick={() => this.onBookRowClick(item)}
          data-index={index}
          key={item.id}
          style={{
            display: 'flex',
            paddingTop: 10,
            paddingBottom: 10,
            backgroundColor: isSelected ? 'rgba(0,100,255,0.05)' : 'white',
            border: isSelected ? `2px solid deepskyblue` : `2px solid transparent`,
            borderBottom: isSelected ? `2px solid deepskyblue` : `2px solid #eee`,
            paddingLeft: 20,
            paddingRight: 20
          }}
        >
          {item.volumeInfo.imageLinks ?
            <img
              alt=""
              className="noSelect"
              src={item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : null}
              style={{
                marginRight: 20,
                objectFit: 'contain',
                alignSelf: 'flex-start',
                height: 100
              }}
            />
            :
            <this.NoCoverImage height={100} width={70} fontSize={12} />
          }
          <div
            className="noSelect"
            style={{

            }}>
            <p style={{
              fontWeight: 'bold',
            }}>{item.volumeInfo.title}{item.volumeInfo.subtitle ? ": " + item.volumeInfo.subtitle : null}
            </p>

            <p style={{
              color: 'grey',
              fontSize: 14,
              marginTop: 5
            }}>{item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : "Author Unavailable"}</p>

            <p style={{
              color: 'grey',
              fontSize: 14,
            }}>{moment(item.volumeInfo.publishedDate).year()}</p>
          </div>
        </motion.div>
      )
    })
    return BookRows
  }

  SelectedBook = (props) => {
    if (!this.state.selectedBook) {
      return null
    }

    // getting the current book
    let book;
    for (let i = 0; i < this.state.searchResults.length; i++) {
      let b = this.state.searchResults[i]
      if (b.id === this.state.selectedBook.id) {
        book = b
      }
    }
    if (!book) return


    const variants = {
      initial: { opacity: 0, scale: 1, y: 200 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 300 * .001 } }
    }

    // determining whether this book is already being downloaded
    let isDownloading = false
    let bookDownload;
    for (let download of this.state.downloads) {
      if (download.id === this.state.selectedBook.id) {
        // if this book is in the downloads
        bookDownload = download
        isDownloading = true
        break
      }
    }

    console.log('bookdownload')
    console.log(bookDownload)

    let BookStatusBar;
    if (isDownloading) {

      let downloadText
      let percent = 0
      if (!bookDownload.contentLength) {
        downloadText = 'Starting download...'
      } else {
        downloadText = `${bytesToString(bookDownload.downloaded)} / ${bytesToString(bookDownload.contentLength)}`
        percent = (bookDownload.downloaded / bookDownload.contentLength) * 100
      }

      BookStatusBar = (
        <div style={{
          position: 'absolute',
          alignSelf: 'flex-end',
          justifyContent: 'flex-end',
          display: 'flex',
          bottom: 0,
          right: 0,
          overflow: 'hidden',
          borderRadius: 4,
        }}>
          <motion.div
            key={book.id}
            variants={variants}
            initial='initial'
            animate='animate'
            style={{
              backgroundColor: '#eee',
              border: `1px solid lightgrey`,
              boxShadow: '0px 0px 8px lightgrey',
              borderRadius: 4,
              padding: 20,
              paddingTop: 10,
              paddingBottom: 10,
              minWidth: 440,
              maxWidth: 440,
            }}>
            <div style={{
              display: 'flex',
              justifyContent: 'left',
              alignSelf: 'center',
            }}>
              <img
                alt=""
                src={SpinnerBlack}
                height={15}
                width={15}
                style={{
                  marginRight: 10,
                  alignSelf: 'center',
                  marginLeft: 10
                }}
              />
              <p style={{
                alignSelf: 'center',
              }}>{downloadText}</p>
            </div>
            <Line percent={percent} strokeWidth="1" strokeColor="deepskyblue" />

          </motion.div>
        </div>
      )

    } else if (book.searching) {
      BookStatusBar = (
        <div style={{
          position: 'absolute',
          alignSelf: 'flex-end',
          justifyContent: 'flex-end',
          display: 'flex',
          bottom: 0,
          right: 0,
          overflow: 'hidden',
          borderRadius: 4,
        }}>
          <motion.div
            key={book.id}
            variants={variants}
            initial='initial'
            animate='animate'
            style={{
              backgroundColor: '#eee',
              border: `1px solid lightgrey`,
              boxShadow: '0px 0px 8px lightgrey',
              borderRadius: 4,
              padding: 20,
              paddingTop: 10,
              paddingBottom: 10,
            }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignSelf: 'center',
            }}>
              <img
                alt=""
                src={SpinnerBlack}
                height={15}
                width={15}
                style={{
                  marginRight: 10,
                  alignSelf: 'center',
                }}
              />
              <p style={{
                alignSelf: 'center',
              }}>Loading sources...</p>
            </div>

          </motion.div>
        </div>
      )
    } else if (book.libgenMatches) {
      let MatchRows = book.libgenMatches.map((match, index) => {
        // the rows of libgen results that match the selected book
        return (
          <motion.div
            onClick={() => this.onLibgenResultClick(match, this.state.selectedBook)}
            whileHover={{
              backgroundColor: 'white',
            }}
            key={match.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: index === 0 ? `2px solid lightgrey` : `1px solid lightgrey`,
              padding: 20,
              paddingTop: 5,
              paddingBottom: 5,
              backgroundColor: '#eee',
            }}>
            <div style={{
              marginRight: 15
            }}>
              <p style={{
                fontWeight: 'bold',
                fontSize: 14,
              }}>{match.title}</p>
              <p style={{

                fontSize: 14,
              }}>{match.author}</p>
            </div>

            <div style={{
              justifyContent: 'flex-end',
              alignSelf: 'flex-start',
              minWidth: 60
            }}>
              <p style={{
                fontWeight: 'bold',
                textAlign: 'right',
                fontSize: 14,
              }}>{match.extension}</p>
              <p style={{
                textAlign: 'right',
                fontSize: 14,
              }}>{match.size}</p>
            </div>
          </motion.div>

        )
      })
      BookStatusBar = (
        <motion.div
          variants={variants}
          initial='initial'
          animate='animate'
          style={{
            position: 'absolute',
            maxWidth: 440,
            minWidth: 440,
            alignSelf: 'flex-end',
            justifyContent: 'flex-end',
            display: 'flex',
            bottom: 0,
            right: 15,
            maxHeight: `50vh`,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            // overflowY: 'scroll',
            overflowX: 'hidden',
            border: `1px solid lightgrey`

          }}>
          <div
            style={{
              backgroundColor: '#eee',
              width: '100%',
              boxShadow: '0px 0px 8px lightgrey',
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,

            }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignSelf: 'center',
              flexDirection: 'column',
              width: '100%',
            }}>
              {MatchRows.length > 0 ?
                <>
                  <div style={{
                    padding: 15,
                    paddingTop: 10,
                    paddingBottom: 10,
                    display: 'flex',
                    backgroundColor: '#eee',
                  }}>
                    <h4>Available versions:</h4>
                  </div>
                  {MatchRows}
                </>
                :
                <div style={{
                  padding: 15,
                  paddingTop: 10,
                  paddingBottom: 10,
                  display: 'flex',
                  backgroundColor: '#eee',
                }}>
                  <h4>This book was not found  (◞‸◟；)</h4>
                </div>
              }
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <div style={{
        display: 'flex',
        padding: 40,
        paddingRight: 30,
        paddingLeft: 30,
        paddingBottom: `calc(50vh + 30px)`,
        overflow: 'hidden'
      }}>
        {BookStatusBar}
        <div style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {book.volumeInfo.imageLinks ?
            <img
              alt=""
              className="book-img"
              src={book.volumeInfo.imageLinks ? book.volumeInfo.imageLinks.thumbnail : null}
              style={{
                marginRight: 20,
                objectFit: 'contain',
                minWidth: 180,
                alignSelf: 'flex-start',
                justifyContent: 'center'
              }}
            />
            :
            <div style={{
              marginRight: 20,
              objectFit: 'contain',
              minWidth: 180,
              alignSelf: 'flex-start',
            }}>
              <this.NoCoverImage height={250} width={170} fontSize={18} />
            </div>
          }
          {book.searching ?
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <img
                alt=""
                src={SpinnerBlack}
                height={15}
                width={15}
                style={{
                  marginRight: 15,
                  alignSelf: 'center',
                }}
              />
              <p style={{
                marginTop: 5,
              }}>Loading sources...</p>
            </div>
            : null
          }
        </div>
        <div style={{
          maxWidth: 600
        }}>
          <p style={{
            fontWeight: 'bold',
            fontSize: 22,
            userSelect: 'text'
          }}>{book.volumeInfo.title}{book.volumeInfo.subtitle ? ": " + book.volumeInfo.subtitle : null}
          </p>

          <p style={{
            color: 'grey',
            userSelect: 'text'
          }}>{book.volumeInfo.authors ? book.volumeInfo.authors.join(", ") : "Author Unavailable"}</p>

          <p style={{
            color: 'grey',
            marginTop: 3,
            userSelect: 'text'
          }}>{moment(book.volumeInfo.publishedDate).year()}</p>

          <p style={{
            marginTop: 20,
            marginBottom: 20,
            userSelect: 'text'
          }}>{book.volumeInfo.description}</p>

          {book.volumeInfo.categories ?
            <>
              <p style={{
                marginTop: 20,
                fontWeight: 'bold',
                color: 'grey'
              }}>Tags</p>
              <p style={{
                marginBottom: 20,
                userSelect: 'text',
              }}>{book.volumeInfo.categories?.join(',')}</p>
            </>
            : null}
          <img src={`http://covers.openlibrary.org/b/isbn/${book.volumeInfo.industryIdentifiers[0]}-L.jpg`} />
        </div>
      </div>
    )
  }


  MainArea = (props) => {

    if (this.state.activeTab === `search`) {
      return (
        <SplitPane
          split="vertical"
          primary="first"
          allowResize={true}
          defaultSize={450}
        >

          <div style={{

            overflow: 'scroll',
            maxHeight: '100vh',
            minHeight: '100vh',
            position: 'relative',
            borderRight: `1px solid lightgrey`
          }}>
            <div style={{
              padding: 10,
              borderBottom: `2px solid #eee`,
              position: 'absolute',
              width: '100%',
              backgroundColor: 'white',
              height: 60
            }}>
              <input
                className="noSelect"
                placeholder='Enter a book title or author'
                type="search"
                onChange={this.onSearchBoxChange}
                value={this.state.searchBox}
                style={{
                  border: '1px solid lightgrey',
                  padding: 10,
                  width: '100%',
                  background: '#eee',
                  borderRadius: 8
                }}
              />
            </div>
            <div style={{
              paddingTop: 60
            }}>
              <this.SearchResults />
            </div>
          </div>

          <div style={{

            height: '100vh',
            overflowX: 'hidden',
            overflowY: 'scroll'
          }}>
            < this.SelectedBook />
          </div>
        </SplitPane>

      )
    } else {
      return (
        <SplitPane
          split="vertical"
          primary="first"
          allowResize={true}
          defaultSize={450}
        >
          <div style={{

            overflow: 'scroll',
            maxHeight: '100vh',
            minHeight: '100vh',
            position: 'relative',
          }}>
          </div>

          <div style={{

          }}>
          </div>
        </SplitPane>
      )
    }

  }

  Sidebar = (props) => {
    return (
      <div
        style={{
          background: '#222',
          minHeight: '100%',
          margin: 0,
          padding: 0,
          overflowX: 'hidden',
          whiteSpace: 'nowrap',
        }}>

        <div
          className="window-button-container"
          style={{
            paddingTop: 10,
            paddingLeft: 10,
            display: 'flex',
            paddingBottom: 10,
            position: 'absolute'
          }}>
          <div
            onClick={() => ipcRenderer.invoke('window-event', 'close')}
            className="window-button"
            style={{
              height: 13,
              width: 13,
              background: '#FF605C',
              borderRadius: '50%',
              marginRight: 8,
              overflow: 'hidden'
            }}>
          </div>
          <div
            onClick={() => ipcRenderer.invoke('window-event', 'minimize')}
            style={{
              height: 13,
              width: 13,
              background: '#FFBD44',
              borderRadius: '50%',
              marginRight: 8
            }}>

          </div>
          <div
            onClick={() => ipcRenderer.invoke('window-event', 'resize')}
            style={{
              height: 13,
              width: 13,
              background: '#00CA4E',
              borderRadius: '50%',
              marginRight: 9
            }}></div>
        </div>


        <h2 style={{
          color: 'white',
          alignSelf: 'left',
          textAlign: 'left',
          marginBottom: 10,
          opacity: .8,
          userSelect: 'none',
          fontWeight: '300',
          fontSize: 22,
          paddingLeft: 20,
          paddingRight: 20,
          marginTop: 40
        }}>Alexandria</h2>
        <p
          onClick={() => this.setActiveTab('bookshelf')}
          style={{
            padding: 5,
            paddingLeft: 20,
            paddingRight: 20,
            backgroundColor: this.state.activeTab === 'bookshelf' ? `rgba(0,0,255,.4)` : `transparent`,
            color: 'white',
            alignSelf: 'center',
            fontSize: 14,
            userSelect: 'none'
          }}><GiBookshelf />&nbsp; Bookshelf</p>

        <p
          onClick={() => this.setActiveTab('search')}
          style={{
            padding: 5,
            paddingLeft: 20,
            paddingRight: 20,
            backgroundColor: this.state.activeTab === 'search' ? `rgba(0,0,255,.4)` : `transparent`,
            color: 'white',
            alignSelf: 'center',
            fontSize: 14,
            userSelect: 'none'
          }}>+ &nbsp;Add new book</p>
      </div>
    )
  }

  render() {

    return (
      <div
        className="main-container"
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowY: 'hidden',
          overflowX: 'hidden',
          minHeight: '100%',
          minWidth: '100%',
          position: 'absolute',
          margin: 0, padding: 0
        }}>
        <SplitPane
          split="vertical"
          primary="first"
          allowResize={true}
          defaultSize={250}
        >

          <this.Sidebar />
          <this.MainArea />
        </SplitPane>

      </div >
    );
  }
}

export default App;
