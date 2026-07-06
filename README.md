# Alexandria
Alexandria is a modern Library Genesis ebook browser. Currently it is Mac only (Apple Silicon).

Book metadata, covers, and descriptions come from [Open Library](https://openlibrary.org), and books are downloaded from Library Genesis mirrors.

## [View Demo](https://streamable.com/gcjzr4)

## Downloads
You can download the DMG via the [Releases page.](https://github.com/Samin100/Alexandria/releases)

The app is not code-signed, so macOS will refuse to open it on first launch. Either right-click the app and choose Open, or run:

```
xattr -cr /Applications/Alexandria.app
```

## Building from source
Requires Node 18+ and yarn.

```
cd alexandria-react && yarn install && cd ../electron && yarn install && cd ..
./build-app.sh
```

The DMG is written to `electron/dist/`. For development, run `yarn start` in `alexandria-react`, then `yarn start` in `electron`.
