const express = require ('express')
const http = require ('http')
const resolve = require ('path').resolve

const app = express ()
app.get ('/', function homeRoute (req, res) {
	res.sendFile (resolve (__dirname, '../static/index.html'))
})
app.get ('/app', function (req, res) {
	res.sendFile (resolve (__dirname, '../static/app/index.html'))
})
app.use (express.static (resolve (__dirname, '../static'), { redirect: false }))

const server = http.createServer (app)


const Levelup = require ('levelup')
const Memdown = require ('memdown')
const Hyperlog = require ('hyperlog')
const Ws = require ('websocket-stream')

const up = Levelup ('counter', { db: Memdown })
const log = Hyperlog (up, { valueEncoding: 'json' })
log.on ('add', node => {
	if (node.value.type !== 'OKAY') log.add ([ node.key ], { type: 'OKAY', time: Date.now () })
})

const wss = Ws.createServer ({ server, path: '/socket' }, stream => {
	stream.pipe (log.replicate ({ live: true })).pipe (stream)
})


const PORT = process.env.PORT || 3001
server.listen (PORT)
console.log ('running on http://:' + PORT)
