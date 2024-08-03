// Imports
const express = require('express');
const router = express.Router();
const fs = require('fs');

/*** API version  ***/
const api_version = "v1";

// API routes handling
router.use('/data', require('./routes/data'));
router.use('/vt_data', require('./routes/vt_data'));
router.use('/time', require('./routes/time'));
router.use('/control', require('./routes/control'));

// Devices list
router.use('/devices/get/', function(req, res, next) {
    var token = req.headers['x-access-token'];
    var device_type = req.headers['x-device-type'] || req.query["device_type"];
    var is_gatorbit = device_type == "gatorbit" || req.query.device_type == "gatorbit";
    var dir_path = "./data" + (is_gatorbit ? "/gatorbit" : "/gatorbyte");
    var devices_list = [];
    
    fs.readdir(dir_path, function (err, files) {
        if (err) { return console.log('Unable to scan directory: ' + err); } 
        files.forEach(function (file) {
            devices_list.push(file.toLowerCase().replace(".csv", "").replace("data_", ""));
        });
        res.send(JSON.stringify(devices_list));
    });

});

// Exports
module.exports = router;