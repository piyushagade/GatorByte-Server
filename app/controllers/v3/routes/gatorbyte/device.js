var express = require('express');
var router = express.Router();
const fs = require('fs');
const { get } = require('./command.js');
const functions = require('./functions.js')();
var socket = require('./socket');
const db = require("./db.js");

var device_type = "gatorbyte";

// Get registration info
router.post('/registration/get', function (req, res, next) {

    // Device Serial Number
    var sn = JSON.parse(req.body)["sn"];

    // Read db
    db.run({
        db: db.instance.sites(req), 
        cmd: "SELECT * FROM ALL_DEVICES WHERE SN=?", 
        values: [sn],
        type: "json",
    })
        .then(function(data) {
            if (data.length == 0) res.status(200).json({
                "status": "error", 
                "message": "No devices with the provided serial number registered.", 
                "code": 1
            });
            else {
                res.status(200).json({ "status": "success", "payload": data[0] });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Error reading DB", "code": 1, "obj": err});
        });
    
});

// Set registration (register device)
router.post('/registration/set', function (req, res, next) {
    req.body = JSON.parse(req.body);

    // Device Serial Number
    var sn = req.body["sn"];
    var projectuuid = req.body["project-uuid"];
    var devicename = req.body["device-name"];

    // Read db
    db.run({
        db: db.instance.sites(req), 
        cmd: "INSERT INTO ALL_DEVICES VALUES(?,?,?,?,?)", 
        values: [uuid(), devicename, projectuuid, "active", sn],
        type: "json",
    })
        .then(function(data) {
            res.status(200).json({ "status": "success", "message": "Device registered." });
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Error reading DB", "code": 1});
        });
    
});

// Request a data sorting using a field (column) name
router.post('/data/sort', function (req, res, next) {
    if (typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.headers["x-device-id"] || req.body.device_id;
    var device_type = req.query.device_type;
    var field_name = req.query.field_name;

    var datastore = "./data" + "/" + device_type + "/" + device_id + "/readings.json";
    if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);

    if (!fs.existsSync(file_name)) {
        res.status(500).json({ "status": "error", "message": "Data file not found." }); return;
    }
    else {

        var alldata = JSON.parse(fs.readFileSync(datastore, "utf8"));
        var ROWS_TO_SORT = alldata.length < 5 ? alldata.length : 5;
        var sorteddata = alldata.slice(-ROWS_TO_SORT).sort((a, b) => { return b["TIMESTAMP"] > a["TIMESTAMP"] ? -1 : 1 });
        sorteddata = alldata.slice(0, alldata.length - ROWS_TO_SORT).concat(sorteddata);
    }

    setTimeout(() => {
        res.send("true");
    }, 1000);
});

module.exports = router;