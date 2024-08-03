// Imports
const express = require('express');
const router = express.Router();
const fs = require('fs');
const f = require('./functions')();
const db = require('./db');

/*** API version  ***/
const api_version = "v2";

// // Start MQTT client
// require('./routes/mqtt/route')

// API routes handling
router.use('/gatorbit', require('./routes/gatorbit/route'));
router.use('/gatorbyte', require('./routes/gatorbyte/route'));
router.use('/gatorbyte-vt', require('./routes/gatorbyte-vt/route'));
router.use('/time', require('./routes/time'));
router.use('/users', require('./users'));

// Devices list
router.use('/devices/get/', function(req, res, next) {
    var device_type = req.headers['x-device-type'] || req.query["device_type"];
    if(!device_type) res.status(400).json({"status": "failed", "message": "'device_type' not provided."});
    var dir_path = "./data" + "/" + device_type;
    var devices_list = [];

    fs.readdir(dir_path, function (err, sites) {
        if (err) { return console.log('Unable to scan directory: ' + err); } 
        sites.forEach(function (site) {
            if(!fs.lstatSync(dir_path + "/" + site).isDirectory()) return;

            try{
                var data = JSON.parse(fs.readFileSync(dir_path + "/" + site + "/site.json", "utf8"));
                devices_list.push(data);
            }
            catch(e) {
                console.log("site.json not found for " + site);
            }
        });
        res.send(devices_list);
    });

});

// Exports
module.exports = router;