const INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MS) ||1000 * 60 * 65
//amount of time since first downloaded until expires
const EXPIRE_TIME = parseInt(process.env.CLEANUP_EXPIRE_MS) || 1000 * 60 * 60

const { VIDEO_HITS, OPEN_DOWNLOADS, VIDEO_PATH } = require('./constants')
const fs = require('fs').promises
function cleanupLoop() {
    purgeOpenDownloads(); //remove any downloads that have expired

    fs.readdir(VIDEO_PATH, { withFileTypes: true })
    .then(entries => {
        console.info('[Cleanup] Cleaning up ' + entries.length)
        entries.forEach(entry => {
            if(entry.isFile()) {
                //get id from filename, ex: videoId-Quality.mp4 or ri_0v9rHB_Q-135.mp4
                const [id,ext] = entry.name.split('.');
                //Check if expired & is mp4, if not skip file
                if(ext !== "mp4") continue;
                if(OPEN_DOWNLOADS.has(id)) continue;

                const hits = VIDEO_HITS.get(id) || 0;
                //todo: logic
            }

        })
    }).catch(err => {
        console.warn('[Cleanup] Failure: ' + err.message)
    })
}

function purgeOpenDownloads() {
    OPEN_DOWNLOADS.forEach(value,key => {
        //if the difference between then and now is > EXPIRE_TIME (default 1hr)
        if(Date.now() - value >= EXPIRE_TIME) {
            OPEN_DOWNLOADS.delete(key);
        }
    })
}
console.info('[Cleanup] Cleaning up every',INTERVAL,"ms")
setTimeout(cleanupLoop,INTERVAL)
cleanupLoop();