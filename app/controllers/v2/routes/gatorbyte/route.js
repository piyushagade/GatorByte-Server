/*
    ! Looks like this is the entry point for the application.
*/

var express = require('express');
var router = express.Router();

//! API routes handling
var routes = ["command", "control", "data", "events", "log", "state", "sites"];
routes.forEach(route => { router.use('/' + route, require('./' + route)); });

//! MQTT
router.mqtt = require('./mqtt').begin();

//! Socket IO
router.onConnection = (io, socket) => {
    require('./socket').begin(io, socket, router.mqtt);
}

module.exports = router;