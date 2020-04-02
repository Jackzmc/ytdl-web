require('dotenv').config()
//setup videos folder
require('fs').promises.mkdir('videos').catch(() => {})

//load core: server, cleanup
require('./modules/server.js')
//require('./modules/cleanup.js')