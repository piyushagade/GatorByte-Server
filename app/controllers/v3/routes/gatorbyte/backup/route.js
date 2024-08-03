var express = require('express');
var router = express.Router();

// API routes handling
var routes = ["command", "control", "data", "events", "log", "state"];
routes.forEach(route => { router.use('/' + route, require('./' + route)); });

// Socket IO
router.onConnection = (ioi, sckt) => {
    require('./socket').begin(ioi, sckt);
}

// MQTT
router.mqtt = require('./mqtt').begin();

module.exports = router;