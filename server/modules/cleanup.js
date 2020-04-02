const INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MS) ||1000 * 60 * 60 * 5 //defaults to 5hr
//amount of time since first downloaded until expires
const EXPIRE_TIME = parseInt(process.env.CLEANUP_EXPIRE_MS) || 1000 * 60 * 60 //defaults to 1hr
//maximum amount of videos to store (maybe capacity later)
const MAX_FILES = parseInt(process.env.CLEANUP_MAX_VIDEOS) || 100;

const { VIDEO_HITS, OPEN_DOWNLOADS, VIDEO_PATH } = require('./constants')
const path = require('path')
const fs = require('fs').promises
function cleanupLoop() {
    const highestHit = Math.max(...VIDEO_HITS.values())
    const pending = [];

    purgeOpenDownloads(); //remove any downloads that have expired

    fs.readdir(VIDEO_PATH)
    .then(entries => {
        //skip cleanup if not hit threshold
        if(entries.length <= MAX_FILES) return;

        console.info('[Cleanup] Cleaning up ' + entries.length)
        entries.forEach(async filename => {
            const _path = path.join(VIDEO_PATH,filename)
            const stat = await fs.stat(_path)
            if(stat.isFile()) {
                //get id from filename, ex: videoId-Quality.mp4 or ri_0v9rHB_Q-135.mp4
                const [id,ext] = filename.split('.');
                //Check if expired & is mp4, if not skip file
                if(ext === "mp4" && !OPEN_DOWNLOADS.has(id)) {
                    const hits = VIDEO_HITS.get(id) || 0;
                    //If file is older than a day
                    if(Date.now() - stat.birthtimeMs >= 8.64e+7) {
                        pending.push({
                            path: _path,
                            hits
                        })
                    }
                }
            }

        })
        return entries.length
    })
    .then((currentCount) => {
        //pending contains all of the files
        pending.sort((a,b) => {
            return a.hits - b.hits
        })
        const toDelete = MAX_FILES - currentCount;
        pending.splice(0, toDelete)
        .forEach(async(v) => {
            await fs.delete(v.path)
        })

    })
    .catch(err => {
        console.warn('[Cleanup] Failure: ' + err.message)
    })
}

function purgeOpenDownloads() {
    OPEN_DOWNLOADS.forEach((value,key) => {
        //if the difference between then and now is > EXPIRE_TIME (default 1hr)
        if(Date.now() - value >= EXPIRE_TIME) {
            OPEN_DOWNLOADS.delete(key);
        }
    })
}
console.info('[Cleanup] Cleaning up every',INTERVAL/1000,"seconds")
setTimeout(cleanupLoop,INTERVAL)
cleanupLoop();