const router = require('express').Router();
const rateLimit = require("express-rate-limit");
const ytdl = require('youtube-dl')
const ytdlCore = require('ytdl-core')
const {REGEX,VIDEO_INFO_CACHE} = require('../modules/constants')
module.exports = router;
router.get('/:url',rateLimit({
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