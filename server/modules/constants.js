const {version:VERSION} = require('../package.json')
const path = require('path')

module.exports = {
    REGEX: new RegExp(process.env.YT_REGEX),
    VIDEO_PATH: path.join(__dirname,"../videos"),
    VIDEO_INFO_CACHE:  new Map(),
    VIDEO_HITS:  new Map(),
    VERSION
}