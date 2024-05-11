import patchWarnings from './patch-warnings.js';
patchWarnings()
import express from 'express';
import bodyParser from 'body-parser';
import fileUpload, { UploadedFile } from 'express-fileupload';
import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import bytesize from 'byte-size'
import WebTorrent from 'webtorrent'
import { createHash } from 'crypto'
const { gray } = chalk


async function server(host: string, port: number, torrentPeerPort: number, downloadDir: string, maxFileSizeMB: number) {
  console.log('direct2peer <<<<===')
  console.log(gray(`HTTP upload server: http://${host}:${port}`));
  console.log(gray(`BitTorrent seeder: http://${host}:${port}`));
  console.log(gray((`Download directory: ${downloadDir}`)));
  console.log(gray((`Max upload file size: ${bytesize(maxFileSizeMB)}`)));
  console.log()

  // Seed existing fileset in downloadDir.
  const client = new WebTorrent({
    torrentPort: torrentPeerPort,
    dht: false, // reduces startup time by 5s, see: https://github.com/webtorrent/webtorrent/issues/1146
  });
  const files = fs.readdirSync(downloadDir)
  console.log(`Seeding existing files in ${downloadDir} (${files.length} files)`)
  files.forEach(file => {
    const filePath = path.join(downloadDir, file);  
    client.seed(filePath, { announce: [] }, (torrent) => {
      console.log(`- ${file} (${bytesize(torrent.length)}) => ${torrent.infoHash}`)
    });
  });
  console.log()

  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(fileUpload({
    limits: { 
      fileSize: maxFileSizeMB
    },
  }));

  // POST /torrents/new
  // Upload a file and seed it as a torrent.
  // Returns infoHash and magnetURI.
  app.post('/torrents/new', (req, res) => {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const file = req.files.file as UploadedFile;
    // SHA256 the file.
    const hash = createHash('sha256').update(file.data).digest('hex');
    // Get the extension.
    const ext = path.extname(file.name);
    const filePath = `${downloadDir}/${hash}${ext}`;
    
    // Log the temp file path.
    console.log(file)

    // File size check
    if (maxFileSizeMB < file.size) {
      return res.status(400).json({ error: `File size ${bytesize(file.size)} is too large. Max size: ${bytesize(maxFileSizeMB)}` });
    }
    
    // Move file to downloads folder with unique UUID filename.
    file.mv(filePath, err => {
      if(err) {
        return res.status(500).json({ error: "error moving file to downloads" })
      }

      // Start seeding it.
      client.seed(filePath, (torrent: any) => {
        const infoHash = torrent.infoHash;
        const magnetURI = torrent.magnetURI;
        
        const info = {
          infoHash,
          magnetURI,
          name: file.name,
          size: file.size,
          path: filePath
        }
        console.log(`/torrents/new => ${JSON.stringify(info)}`)
        res.json({ infoHash, magnetURI });
      });

    })    
  });

  // GET /torrents
  // Gets the actively seeded torrents.
  // Returns a JSON array of torrents.
  app.get('/torrents', (req, res) => {
    const torrents = client.torrents.map((torrent) => {
      return {
        infoHash: torrent.infoHash,
        magnetURI: torrent.magnetURI,
        name: torrent.name,
        size: torrent.length,
        path: torrent.path
      }
    })
    res.json(torrents);
  })

  app.get('/', (req, res) => {
    res.send(`<a href=/torrents>/torrents</a>`)
  })

  app.listen(port, () => {
  });
}


import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .scriptName('direct2torrent')
  .command('start', 'Start the server', (yargs) => {
    yargs.option('host', {
      describe: 'Host name for the server',
      type: 'string',
      default: '0.0.0.0',
      demandOption: false
    });
    yargs.option('port', {
      describe: 'Port number for the server',
      type: 'number',
      demandOption: true
    });
    yargs.option('dir', {
      describe: 'Download directory',
      type: 'string',
      demandOption: true
    });
    yargs.option('torrent-peer-port', {
      describe: 'Torrent peer port',
      type: 'number',
      default: 6881
    })
    yargs.option('max-upload-size', {
      describe: 'Max upload file size in MB',
      type: 'number',
      // Max file size: 100MB.
      default: 100
    })
  }, (argv) => {
    start(argv)
  })
  .help()
  .argv;

function start(argv) {
  const port = argv.port as number;
  const downloadDir = argv.dir as string;

  // Resolve downloadDir from relative to absolute path.
  const downloadDir2 = path.resolve(downloadDir);
  
  server(
    argv.host, 
    port, 
    argv.torrentPeerPort, 
    downloadDir2, 
    argv.maxUploadSize * 1000 * 1000 /* convert to bytes */
  )
  .then(x => {})
  .catch(err => {
    throw err
  })
}