const router = require('express').Router();
const slowDown = require("express-slow-down");
const rateLimit = require("express-rate-limit");
const {execShellCmd} = require('../modules/util')
const path = require('path')
const ytdl = require('youtube-dl')
    
const {VIDEO_PATH,VIDEO_HITS,OPEN_DOWNLOADS,BANNED_IP_LIST} = require('../modules/constants')
const {access} = require('fs').promises
module.exports = router;

const YTDL_PATH = ytdl.getYtdlBinary()
const downloadLimiter = slowDown({
    windowMs: 1000 * 60 * 5, // 15 minutes
    delayAfter: 2, // allow 100 requests per 15 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 100:
});
router.use((req,res,next) => {
    //ban check
    if(BANNED_IP_LIST.includes(req.ip)) return res.status(403).send('403 Forbidden')
    next();
})
router.get('/audio/:id',downloadLimiter,rateLimit({
    windowMs: 1000 * 60 * 10,
    max: 20
}),(req,res) => {
    try {
        res.type('audio/mp4')
        res.setHeader('Content-disposition', `attachment; filename=${req.params.id}.m4a`);
        const video = ytdl(
            `https://youtu.be/${req.params.id}`,
            ["-f bestaudio[ext=m4a]"]
        )
        video.on('end', () => res.end());
        video.pipe(res)
        //res.download(req.params.id)
    }catch(err) {
        console.error('[Download/Audio]',err.stack)
        res.status(500).send('Internal Server Error')
    }
})
router.get('/video/:id',downloadLimiter,rateLimit({
    windowMs: 1000 * 60 * 10,
    max: 20
}),async(req,res) => {
    //quality defaults to 480p and down
    const quality = req.query.quality
    const FILE_NAME = `${req.params.id}-${quality}.mp4`; 
    const FILE_PATH = path.join(VIDEO_PATH,FILE_NAME);
    if(!quality) return res.status(400).send('Invalid request.')
    access(FILE_PATH)
    .then(r => {
        res.header('X-Cache-Status','HIT')
        incrementHits(req.params.id)
        return res.download(FILE_PATH)
    })
    .catch(err => {
        console.debug('not exist')
        execShellCmd(
            `${YTDL_PATH} ${req.params.id} -f ${quality}+bestaudio[ext=m4a] --merge-output-format mp4 --ffmpeg-location \"${process.env.FFMPEG_LOCATION}\" --output \"${FILE_NAME}\" --add-metadata --embed-thumbnail --no-playlist`,
            {cwd:VIDEO_PATH}
        )
        .then(({stdout,stderr}) => {
            if(stderr) {
                console.log('[download/video]',stderr)
                res.status(500).send('Failed to download video.<br>' + err.message + "<br>" + stderr)
            }else{
                //set download timer to now to prevent video from being deleted too early
                OPEN_DOWNLOADS.set(req.params.id,Date.now())
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