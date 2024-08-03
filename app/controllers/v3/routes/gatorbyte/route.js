var express = require('express');
var router = express.Router();

// API routes handling
var routes = ["command", "control", "data", "events", "log", "state", "sites", "projects", "device", "groupme", "sites"];
routes.forEach(route => { router.use('/' + route, require('./' + route)); });

// MQTT
router.mqtt = require('./mqtt').begin();

// Socket IO
router.connection = (io, socket) => { 
    console.log("SocketIO server is now active.");
    require('./socket').begin(io, socket, router.mqtt);
}

router.get('/cloudflare/devmode', function(req, res, next) {

});

module.exports = router;