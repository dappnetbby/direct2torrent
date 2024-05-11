
# direct2torrent

A simple file upload service which publishes uploads on BitTorrent, and returns the magnet URI.

Made at Sozu Haus Australia 2024.

The server runs a BitTorrent peer and immediately starts seeding the file via webtorrent.

## Install.

```sh
npm i
npm run build
```

## Usage.

```sh
# Start the server.
node --no-warnings build/index.js start --port 8082 --dir ./downloads

# Upload a file.
# tar -cf $FOLDER.tar $FOLDER/ && curl --verbose -X POST --progress-bar -F "file=@./$FOLDER.tar" -o /dev/stdout http://3.64.252.173:8082/torrents/new | jq -r .magnetURI
tar -cf src.tar src/ && curl -X POST -F "file=@./src.tar" http://localhost:8082/torrents/new

# Upload goodstuff/ to BitTorrent, converting it to a .tar archive and uploading it to the remote direct-to-torrent server
export FOLDER=goodstuff/
tar -cf $FOLDER.tar $FOLDER/ && curl --verbose -X POST --progress-bar -F "file=@./$FOLDER.tar" -o /dev/stdout http://3.64.252.173:8082/torrents/new | jq -r .magnetURI

# {"infoHash":"9a87d6cdcadf1428e9726214ca914dd218005908","magnetURI":"magnet:?xt=urn:btih:9a87d6cdcadf1428e9726214ca914dd218005908&dn=6f2eb9f7bee3dc85780cf6d5d86a04220fd44aa07be371fabf9d0a1b25515149.tar&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev"}%
```

