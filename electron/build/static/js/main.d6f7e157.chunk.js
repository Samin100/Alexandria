(this["webpackJsonpalexandria-react"]=this["webpackJsonpalexandria-react"]||[]).push([[0],{26:function(e,t,n){e.exports=n.p+"static/media/unconvinced.1de6c75d.mp3"},31:function(e,t,n){e.exports=n(58)},36:function(e,t,n){},58:function(e,t,n){"use strict";n.r(t);var a=n(0),o=n.n(a),i=n(23),l=n.n(i),r=(n(36),n(12)),s=n(6),c=n(24),d=n(25),g=n(27),u=n(30),h=n(11),m=n.n(h),f=n(8),p=n.n(f),v=n(4),b=n(28),y=n(5),w=n(9),k=n.n(w),x=n(10),E=n(29),S=n(26),R=n.n(S),B=window.require("electron").ipcRenderer,C=function(e){var t=Math.floor(Math.log(e)/Math.log(1024));return 1*(e/Math.pow(1024,t)).toFixed(2)+" "+["B","kB","MB","GB","TB"][t]},I=function(e){Object(u.a)(n,e);var t=Object(g.a)(n);function n(e){var a,i=this;return Object(c.a)(this,n),(a=t.call(this,e)).setActiveTab=function(e){a.setState({activeTab:e})},a.onSearchBoxChange=function(e){a.setState({searchBox:e.target.value}),""===e.target.value.trim()&&a.setState({searchResults:null,selectedBook:null}),a.fetchGoogleBooksDebounced(e.target.value)},a.fetchGoogleBooks=function(e){e.trim()&&m.a.get("https://www.googleapis.com/books/v1/volumes",{params:{q:e}}).then((function(t){if(a.state.searchBox===e&&t.data.items)if(t.data.items.length>0){var n=Object(y.uniqBy)(t.data.items,"id");a.setState({searchResults:n,selectedBook:t.data.items[0]}),a.FetchLibgenSearchResults(t.data.items[0])}else a.setState({searchResults:[],selectedBook:null})}))},a.onLibgenResultClick=function(e,t){var n={libgenResult:e,googleBook:t,status:"getting-download-page",id:t.id};a.setState({downloads:[a.state.downloads,n]}),console.log(n),B.invoke("download-book",{libgenBook:e,googleBook:a.state.selectedBook}).then((function(e){console.log(e)}))},a.onBookRowClick=function(e){var t;(null===(t=a.state.selectedBook)||void 0===t?void 0:t.id)===e.id?a.setState({selectedBook:null}):(a.setState({selectedBook:e}),a.FetchLibgenSearchResults(e))},a.handleLibgenSearchResults=function(e,t){console.log(e);var n=[];e.forEach((function(e,a){if(["epub","pdf","mobi"].includes(e.extension.toLowerCase())){var o=Object(y.deburr)(t.volumeInfo.title),i=Object(y.deburr)(e.title);i=(i=i.replace(/(\[.*?\])/g,"")).replace(/(\(.*?\))/g,""),o=(o=o.replace(/(\[.*?\])/g,"")).replace(/(\(.*?\))/g,""),i=i.trim().toLowerCase(),o=o.trim().toLowerCase();p()(t.volumeInfo.publishedDate).year(),parseInt(e.year);n.push(e)}})),a.state.searchResults&&a.setState({searchResults:a.state.searchResults.map((function(e,a){return e.id===t.id?Object(s.a)({},e,{libgenMatches:n,searching:!1}):e}))})},a.FetchLibgenSearchResults=function(e){if(console.log("searching libgen for",e.volumeInfo.title),!e.searching&&!Array.isArray(e.libgenMatches)&&e){a.setState({searchResults:a.state.searchResults.map((function(t,n){return e.id===t.id?Object(s.a)({},t,{searching:!0}):t}))});var t=e.volumeInfo.title;t=e.volumeInfo.subtitle?t+" "+e.volumeInfo.subtitle:t,t+=" ".concat(e.volumeInfo.authors?e.volumeInfo.authors:""),console.log(t),B.invoke("search-libgen-nonfiction",t).then((function(n){n?0===n.length?(t=e.volumeInfo.title+" ".concat(e.volumeInfo.authors?e.volumeInfo.authors[0]:""),console.log(t),B.invoke("search-libgen-nonfiction",e.volumeInfo.title).then((function(t){a.handleLibgenSearchResults(t,e)}))):a.handleLibgenSearchResults(n,e):a.setState({searchResults:a.state.searchResults.map((function(t,n){return t.id===e.id?Object(s.a)({},t,{searching:!1}):t}))})}))}},a.NoCoverImage=function(e){return o.a.createElement("div",{style:{backgroundColor:"#eee",minHeight:e.height?e.height:e.width/3,minWidth:e.width?e.width:"100%",marginRight:20,objectFit:"contain",alignSelf:"flex-start",display:"flex",alignItems:"center"}},o.a.createElement("p",{style:{flex:1,alignSelf:"center",justifyContent:"center",color:"grey",fontSize:e.fontSize,textAlign:"center"}},"No cover"))},a.SearchResults=function(e){return a.state.searchResults?a.state.searchResults.map((function(e,t){var n,l=(null===(n=a.state.selectedBook)||void 0===n?void 0:n.id)===e.id,r={initial:{opacity:0,y:60},animate:{opacity:1,y:0,transition:{delay:.03*t}}};return o.a.createElement(v.a.div,{className:"noSelect",initial:"initial",animate:"animate",variants:r,onClick:function(){return a.onBookRowClick(e)},"data-index":t,key:e.id,style:{display:"flex",paddingTop:10,paddingBottom:10,backgroundColor:l?"rgba(0,100,255,0.05)":"white",border:l?"2px solid deepskyblue":"2px solid transparent",borderBottom:l?"2px solid deepskyblue":"2px solid #eee",paddingLeft:20,paddingRight:20}},e.volumeInfo.imageLinks?o.a.createElement("img",{alt:"",className:"noSelect",src:e.volumeInfo.imageLinks?e.volumeInfo.imageLinks.thumbnail:null,style:{marginRight:20,objectFit:"contain",alignSelf:"flex-start",height:100}}):o.a.createElement(i.NoCoverImage,{height:100,width:70,fontSize:12}),o.a.createElement("div",{className:"noSelect",style:{}},o.a.createElement("p",{style:{fontWeight:"bold"}},e.volumeInfo.title,e.volumeInfo.subtitle?": "+e.volumeInfo.subtitle:null),o.a.createElement("p",{style:{color:"grey",fontSize:14,marginTop:5}},e.volumeInfo.authors?e.volumeInfo.authors.join(", "):"Author Unavailable"),o.a.createElement("p",{style:{color:"grey",fontSize:14}},p()(e.volumeInfo.publishedDate).year())))})):null},a.SelectedBook=function(e){var t,n;if(!a.state.selectedBook)return null;for(var l=0;l<a.state.searchResults.length;l++){var s=a.state.searchResults[l];s.id===a.state.selectedBook.id&&(n=s)}if(n){var c,d,g,u={initial:{opacity:0,scale:1,y:200},animate:{opacity:1,scale:1,y:0,transition:{duration:.3}}},h=!1,m=Object(r.a)(a.state.downloads);try{for(m.s();!(d=m.n()).done;){var f=d.value;if(f.id===a.state.selectedBook.id){c=f,h=!0;break}}}catch(x){m.e(x)}finally{m.f()}if(console.log("bookdownload"),console.log(c),h){var b,y=0;c.contentLength?(b="".concat(C(c.downloaded)," / ").concat(C(c.contentLength)),y=c.downloaded/c.contentLength*100):b="Starting download...",g=o.a.createElement("div",{style:{position:"absolute",alignSelf:"flex-end",justifyContent:"flex-end",display:"flex",bottom:0,right:0,overflow:"hidden",borderRadius:4}},o.a.createElement(v.a.div,{key:n.id,variants:u,initial:"initial",animate:"animate",style:{backgroundColor:"#eee",border:"1px solid lightgrey",boxShadow:"0px 0px 8px lightgrey",borderRadius:4,padding:20,paddingTop:10,paddingBottom:10,minWidth:440,maxWidth:440}},o.a.createElement("div",{style:{display:"flex",justifyContent:"left",alignSelf:"center"}},o.a.createElement("img",{alt:"",src:k.a,height:15,width:15,style:{marginRight:10,alignSelf:"center",marginLeft:10}}),o.a.createElement("p",{style:{alignSelf:"center"}},b)),o.a.createElement(E.a,{percent:y,strokeWidth:"1",strokeColor:"deepskyblue"})))}else if(n.searching)g=o.a.createElement("div",{style:{position:"absolute",alignSelf:"flex-end",justifyContent:"flex-end",display:"flex",bottom:0,right:0,overflow:"hidden",borderRadius:4}},o.a.createElement(v.a.div,{key:n.id,variants:u,initial:"initial",animate:"animate",style:{backgroundColor:"#eee",border:"1px solid lightgrey",boxShadow:"0px 0px 8px lightgrey",borderRadius:4,padding:20,paddingTop:10,paddingBottom:10}},o.a.createElement("div",{style:{display:"flex",justifyContent:"center",alignSelf:"center"}},o.a.createElement("img",{alt:"",src:k.a,height:15,width:15,style:{marginRight:10,alignSelf:"center"}}),o.a.createElement("p",{style:{alignSelf:"center"}},"Loading sources..."))));else if(n.libgenMatches){var w=n.libgenMatches.map((function(e,t){return o.a.createElement(v.a.div,{onClick:function(){return a.onLibgenResultClick(e,a.state.selectedBook)},whileHover:{backgroundColor:"white"},key:e.id,style:{display:"flex",justifyContent:"space-between",borderTop:0===t?"2px solid lightgrey":"1px solid lightgrey",padding:20,paddingTop:5,paddingBottom:5,backgroundColor:"#eee"}},o.a.createElement("div",{style:{marginRight:15}},o.a.createElement("p",{style:{fontWeight:"bold",fontSize:14}},e.title),o.a.createElement("p",{style:{fontSize:14}},e.author)),o.a.createElement("div",{style:{justifyContent:"flex-end",alignSelf:"flex-start",minWidth:60}},o.a.createElement("p",{style:{fontWeight:"bold",textAlign:"right",fontSize:14}},e.extension),o.a.createElement("p",{style:{textAlign:"right",fontSize:14}},e.size)))}));g=o.a.createElement(v.a.div,{variants:u,initial:"initial",animate:"animate",style:{position:"absolute",maxWidth:440,minWidth:440,alignSelf:"flex-end",justifyContent:"flex-end",display:"flex",bottom:0,right:15,maxHeight:"50vh",borderTopLeftRadius:4,borderTopRightRadius:4,overflowX:"hidden",border:"1px solid lightgrey"}},o.a.createElement("div",{style:{backgroundColor:"#eee",width:"100%",boxShadow:"0px 0px 8px lightgrey",borderTopLeftRadius:4,borderTopRightRadius:4}},o.a.createElement("div",{style:{display:"flex",justifyContent:"center",alignSelf:"center",flexDirection:"column",width:"100%"}},w.length>0?o.a.createElement(o.a.Fragment,null,o.a.createElement("div",{style:{padding:15,paddingTop:10,paddingBottom:10,display:"flex",backgroundColor:"#eee"}},o.a.createElement("h4",null,"Available versions:")),w):o.a.createElement("div",{style:{padding:15,paddingTop:10,paddingBottom:10,display:"flex",backgroundColor:"#eee"}},o.a.createElement("h4",null,"This book was not found  (\u25de\u2038\u25df\uff1b)")))))}return o.a.createElement("div",{style:{display:"flex",padding:40,paddingRight:30,paddingLeft:30,paddingBottom:"calc(50vh + 30px)",overflow:"hidden"}},g,o.a.createElement("div",{style:{alignItems:"center",justifyContent:"center"}},n.volumeInfo.imageLinks?o.a.createElement("img",{alt:"",className:"book-img",src:n.volumeInfo.imageLinks?n.volumeInfo.imageLinks.thumbnail:null,style:{marginRight:20,objectFit:"contain",minWidth:180,alignSelf:"flex-start",justifyContent:"center"}}):o.a.createElement("div",{style:{marginRight:20,objectFit:"contain",minWidth:180,alignSelf:"flex-start"}},o.a.createElement(i.NoCoverImage,{height:250,width:170,fontSize:18})),n.searching?o.a.createElement("div",{style:{display:"flex",justifyContent:"flex-start"}},o.a.createElement("img",{alt:"",src:k.a,height:15,width:15,style:{marginRight:15,alignSelf:"center"}}),o.a.createElement("p",{style:{marginTop:5}},"Loading sources...")):null),o.a.createElement("div",{style:{maxWidth:600}},o.a.createElement("p",{style:{fontWeight:"bold",fontSize:22,userSelect:"text"}},n.volumeInfo.title,n.volumeInfo.subtitle?": "+n.volumeInfo.subtitle:null),o.a.createElement("p",{style:{color:"grey",userSelect:"text"}},n.volumeInfo.authors?n.volumeInfo.authors.join(", "):"Author Unavailable"),o.a.createElement("p",{style:{color:"grey",marginTop:3,userSelect:"text"}},p()(n.volumeInfo.publishedDate).year()),o.a.createElement("p",{style:{marginTop:20,marginBottom:20,userSelect:"text"}},n.volumeInfo.description),n.volumeInfo.categories?o.a.createElement(o.a.Fragment,null,o.a.createElement("p",{style:{marginTop:20,fontWeight:"bold",color:"grey"}},"Tags"),o.a.createElement("p",{style:{marginBottom:20,userSelect:"text"}},null===(t=n.volumeInfo.categories)||void 0===t?void 0:t.join(","))):null,o.a.createElement("img",{src:"http://covers.openlibrary.org/b/isbn/".concat(n.volumeInfo.industryIdentifiers[0],"-L.jpg")})))}},a.MainArea=function(e){return"search"===a.state.activeTab?o.a.createElement(x.a,{split:"vertical",primary:"first",allowResize:!0,defaultSize:450},o.a.createElement("div",{style:{overflow:"scroll",maxHeight:"100vh",minHeight:"100vh",position:"relative",borderRight:"1px solid lightgrey"}},o.a.createElement("div",{style:{padding:10,borderBottom:"2px solid #eee",position:"absolute",width:"100%",backgroundColor:"white",height:60}},o.a.createElement("input",{className:"noSelect",placeholder:"Enter a book title or author",type:"search",onChange:a.onSearchBoxChange,value:a.state.searchBox,style:{border:"1px solid lightgrey",padding:10,width:"100%",background:"#eee",borderRadius:8}})),o.a.createElement("div",{style:{paddingTop:60}},o.a.createElement(i.SearchResults,null))),o.a.createElement("div",{style:{height:"100vh",overflowX:"hidden",overflowY:"scroll"}},o.a.createElement(i.SelectedBook,null))):o.a.createElement(x.a,{split:"vertical",primary:"first",allowResize:!0,defaultSize:450},o.a.createElement("div",{style:{overflow:"scroll",maxHeight:"100vh",minHeight:"100vh",position:"relative"}}),o.a.createElement("div",{style:{}}))},a.Sidebar=function(e){return o.a.createElement("div",{style:{background:"#222",minHeight:"100%",margin:0,padding:0,overflowX:"hidden",whiteSpace:"nowrap"}},o.a.createElement("div",{className:"window-button-container",style:{paddingTop:10,paddingLeft:10,display:"flex",paddingBottom:10,position:"absolute"}},o.a.createElement("div",{onClick:function(){return B.invoke("window-event","close")},className:"window-button",style:{height:13,width:13,background:"#FF605C",borderRadius:"50%",marginRight:8,overflow:"hidden"}}),o.a.createElement("div",{onClick:function(){return B.invoke("window-event","minimize")},style:{height:13,width:13,background:"#FFBD44",borderRadius:"50%",marginRight:8}}),o.a.createElement("div",{onClick:function(){return B.invoke("window-event","resize")},style:{height:13,width:13,background:"#00CA4E",borderRadius:"50%",marginRight:9}})),o.a.createElement("h2",{style:{color:"white",alignSelf:"left",textAlign:"left",marginBottom:10,opacity:.8,userSelect:"none",fontWeight:"300",fontSize:22,paddingLeft:20,paddingRight:20,marginTop:40}},"Alexandria"),o.a.createElement("p",{onClick:function(){return a.setActiveTab("bookshelf")},style:{padding:5,paddingLeft:20,paddingRight:20,backgroundColor:"bookshelf"===a.state.activeTab?"rgba(0,0,255,.4)":"transparent",color:"white",alignSelf:"center",fontSize:14,userSelect:"none"}},o.a.createElement(b.a,null),"\xa0 Bookshelf"),o.a.createElement("p",{onClick:function(){return a.setActiveTab("search")},style:{padding:5,paddingLeft:20,paddingRight:20,backgroundColor:"search"===a.state.activeTab?"rgba(0,0,255,.4)":"transparent",color:"white",alignSelf:"center",fontSize:14,userSelect:"none"}},"+ \xa0Add new book"))},a.state={searchBox:"",searchResults:[],selectedBook:null,activeTab:"search",downloads:[]},a.fetchGoogleBooksDebounced=Object(y.debounce)(a.fetchGoogleBooks,300),a}return Object(d.a)(n,[{key:"componentDidMount",value:function(){var e=this;B.on("download-progress",(function(t,n){console.log(n);var a,o=[],i=Object(r.a)(e.state.downloads);try{for(i.s();!(a=i.n()).done;){var l=a.value;n.id===l.id?o.push(Object(s.a)({},l,{contentLength:n.contentLength,downloaded:n.downloaded})):o.push(l)}}catch(c){i.e(c)}finally{i.f()}e.setState({downloads:o})})),B.on("download-complete",(function(t,n){var a=[];e.state.downloads.forEach((function(e){if(e.id!==n.id)a.push(e);else{var t,o,i=e.googleBook.volumeInfo.title;new Audio(R.a).play(),new Notification(i,{body:"Download complete.",sound:!1,silent:!0,icon:null===(t=e.googleBook.volumeInfo)||void 0===t||null===(o=t.imageLinks)||void 0===o?void 0:o.thumbnail}).onclick=function(){console.log("notification clicked"),console.log(e.googleBook)}}})),e.setState({downloads:a})})),m.a.get("https://www.googleapis.com/books/v1/volumes",{params:{q:"ron chernow"}}).then((function(t){e.setState({searchResults:t.data.items})}))}},{key:"render",value:function(){return o.a.createElement("div",{className:"main-container",style:{display:"flex",flexDirection:"row",overflowY:"hidden",overflowX:"hidden",minHeight:"100%",minWidth:"100%",position:"absolute",margin:0,padding:0}},o.a.createElement(x.a,{split:"vertical",primary:"first",allowResize:!0,defaultSize:250},o.a.createElement(this.Sidebar,null),o.a.createElement(this.MainArea,null)))}}]),n}(a.Component);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));l.a.render(o.a.createElement(o.a.StrictMode,null,o.a.createElement(I,null)),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))},9:function(e,t,n){e.exports=n.p+"static/media/spinner-black.693c372b.svg"}},[[31,1,2]]]);
//# sourceMappingURL=main.d6f7e157.chunk.js.map