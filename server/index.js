require('dotenv').config()
const express = require('express')
const app = express();
const ytdl = require('youtube-dl');
const ytdlCore = require('ytdl-core')
const cors = require('cors')
const {execShellCmd} = require('./util')
const slowDown = require("express-slow-down");
const rateLimit = require("express-rate-limit");
const path = require('path')
const fs = require('fs').promises

const REGEX = new RegExp(process.env.YT_REGEX)
const VIDEO_PATH = path.join(__dirname,"videos")
const YTDL_PATH = ytdl.getYtdlBinary()
const VIDEO_INFO_CACHE = new Map();
const VIDEO_HITS = new Map();
const {version:VERSION} = require('./package.json')

const downloadLimiter = slowDown({
    windowMs: 1000 * 60 * 5, // 15 minutes
    delayAfter: 2, // allow 100 requests per 15 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 100:
    // request # 101 is delayed by  500ms
    // request # 102 is delayed by 1000ms
    // request # 103 is delayed by 1500ms
    // etc.
  });

app.listen(process.env.WEB_PORT||8080,() => {
    console.info('[Listening on :' + (process.env.WEB_PORT||8080))
})
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    exposedHeaders:['X-YTDL-Version','X-Cache-Status','X-RateLimit-Limit','Retry-After','X-Server-Version']
}))

let YTDL_VERSION = "Unknown";
ytdl.exec('', ['--version'], {}, (err, output) => {
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
    const hitsArray = Array.from(VIDEO_HITS.entries()).forEach(v => hits[v[0]] = v[1])
    res.json({
        hits,
        info:Array.from(VIDEO_INFO_CACHE.keys()),
        file:await fs.readdir('videos')
    })
})
app.get('/fetch/:url',rateLimit({
    windowMs:1000 * 60 * 1,
    max:10,
    message:{error:'Too many requests have been sent, please try again later.'},
    skip(req,res) {
        return VIDEO_INFO_CACHE.has(req.params.id)
    }
}),(req,res) => {
    const SHOW_RAW = process.env.NODE_ENV !== "production" && req.query.raw
    try {
        if(REGEX.test(req.params.url)) {
            const id = ytdlCore.getURLVideoID(req.params.url)
            if(!SHOW_RAW && VIDEO_INFO_CACHE.has(id)) {
                res.header('X-Cache-Status','HIT')

                return res.json(VIDEO_INFO_CACHE.get(id))
            }else{
                ytdl.getInfo(req.params.url, (err, info) => {
                    if (err) {
                        return res.status(500).json({error:err.message})
                    }else{
                        res.header('X-Cache-Status','MISS')
                        const data = {
                            title:info.title,
                            uploader:info.uploader,
                            thumbnail_url:info.thumbnails[0].url,
                            id:info.id,
                            views:info.view_count,
                            likes:info.like_count,
                            uploaded:info.upload_date,
                            formats:SHOW_RAW?info.formats:info.formats.map(v=> {
                                return {
                                    id:v.format_id,
                                    ext:v.ext,
                                    quality:v.format_note
                                }
                            }),
                            raw:SHOW_RAW ? info : undefined
                        }
                        VIDEO_INFO_CACHE.set(info.id,data);
                        return res.json(data)
                    }
                })
            }
        }else{
            return res.status(400).json({error:'Invalid URL. Does not match regex.'})
        }
    }catch(err) {
        return res.status(500).json({error:err.message})
    }
})
app.get('/download/audio/:id',downloadLimiter,rateLimit({
    windowMs: 1000 * 60 * 10,
    max: 20
}),(req,res) => {
    try {
        console.log(req.params.id)
        const video = ytdl(
            `https://youtu.be/${req.params.id}`,
            ["-f bestaudio"]
        )
        video.on('end', () => res.end());
        video.pipe(res)
        //res.download(req.params.id)
    }catch(err) {
        console.error('[Download/Audio]',err.stack)
        res.status(500).send('Internal Server Error')
    }
})
//possibly download it to tmp directory, remove after X time not used (auto cleanup based off HITS), serve downloaded.
app.get('/download/video/:id',downloadLimiter,rateLimit({
    windowMs: 1000 * 60 * 10,
    max: 20
}),async(req,res) => {
    //quality defaults to 480p and down
    const quality = req.query.quality
    const FILE_NAME = `${req.params.id}-${quality}.mp4`; 
    const FILE_PATH = path.join(__dirname,"videos",FILE_NAME);
    if(!quality) return res.status(400).send('Invalid request.')
    fs.stat(FILE_PATH)
    .then(r => {
        res.header('X-Cache-Status','HIT')
        incrementHits(req.params.id)
        return res.download(FILE_PATH)
    }).catch(err => {
        execShellCmd(
            `${YTDL_PATH} ${req.params.id} -f ${quality}+bestaudio[ext=m4a] --merge-output-format mp4 --ffmpeg-location \"${process.env.FFMPEG_LOCATION}\" --output \"${FILE_NAME}\" --add-metadata --embed-thumbnail --no-playlist`,
            {cwd:VIDEO_PATH}
        )
        .then(({stdout,stderr}) => {
            if(stderr) {
                console.log('[download/video]',stderr)
                res.status(500).send('Failed to download video.<br>' + err.message + "<br>" + stderr)
            }else{
                incrementHits(req.params.id)
                res.header('X-Cache-Status','MISS')
                res.download(FILE_PATH)
            }
        })
        .catch(err => {
            console.error('[Download/Audio]',err.stack)
            res.status(500).send('Internal Server Error')
        })
    })

})
//--add-metadata --embed-thumbnail

function incrementHits(id) {
    const last_value = VIDEO_HITS.get(id) || 0;
    VIDEO_HITS.set(id,last_value+1)
}