const express = require('express')
const app = express();
const cors = require('cors')
const {exec:ytdlExec} = require('youtube-dl')
const fs = require('fs').promises
const {VIDEO_INFO_CACHE,VIDEO_HITS,VERSION} = require('./constants')

app.listen(process.env.WEB_PORT||8080,() => {
    console.info('[Listening on :' + (process.env.WEB_PORT||8080))
})
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    exposedHeaders:['X-YTDL-Version','X-Cache-Status','X-RateLimit-Limit','Retry-After','X-Server-Version']
}))

let YTDL_VERSION = "Unknown";
ytdlExec('', ['--version'], {}, (err, output) => {
    YTDL_VERSION = output.join();
    console.info('youtube-dl version:',YTDL_VERSION)
})
app.use((req, res, next)  => {
    res.header('X-YTDL-Version', YTDL_VERSION);
    res.header('X-Server-Version',VERSION)
    if(process.env.NODE_ENV === "production") app.set('trust proxy', 1);
    next();
});
app.get('/debug',async(req,res) => {
    let hits = {}
    Array.from(VIDEO_HITS.entries()).forEach(v => hits[v[0]] = v[1])
    res.json({
        hits,
        info:Array.from(VIDEO_INFO_CACHE.keys()),
        file:await fs.readdir('videos')
    })
})
app.use('/fetch',require('../routes/fetch.js'))
app.use('/download',require('../routes/download.js'))
//possibly download it to tmp directory, remove after X time not used (auto cleanup based off HITS), serve downloaded.
