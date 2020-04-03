const INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MS) ||1000 * 60 * 60 * 5 //defaults to 5hr
//amount of time since first downloaded until expires
const EXPIRE_TIME = parseInt(process.env.CLEANUP_EXPIRE_MS) || 1000 * 60 * 60 //defaults to 1hr
//maximum amount of videos to store (maybe capacity later)
const MAX_FILES = parseInt(process.env.CLEANUP_MIN_THRESHOLD) || 100;

const PURGE_ENABLED = !!process.env.PURGE_ENABLED //check if purge enabled
const PURGE_AGE_THRESHOLD = parseInt(process.env.CLEANUP_PURGE_OLDER_MS) || 6.048e+8; //defaults to 1 week
const PURGE_HITS_THRESHOLD = parseInt(process.env.CLEANUP_PURGE_LESS_THAN_HITS) || 100;

const { VIDEO_HITS, OPEN_DOWNLOADS, VIDEO_PATH } = require('./constants')
const path = require('path')
const fs = require('fs').promises
function cleanupLoop() {
    const highestHit = Math.max(...VIDEO_HITS.values())
    const pending = []; //into large array, splice only x amount

    purgeOpenDownloads(); //remove any downloads that have expired

    fs.readdir(VIDEO_PATH)
    .then(entries => {
        //skip cleanup if not hit threshold
        const thresholdHit = entries.length >= MAX_FILES

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
                    if(thresholdHit) {
                        pending.push({
                            path: _path,
                            hits
                        })
                    }else if(PURGE_ENABLED && Date.now() - stat.birthtimeMs >= PURGE_AGE_THRESHOLD) {
                        if(hits <= PURGE_HITS_THRESHOLD) {
                            await fs.delete(_path);
                        }
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