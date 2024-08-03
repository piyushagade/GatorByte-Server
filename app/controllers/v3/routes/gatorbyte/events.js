var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";

// Get events
router.get('/events/get', function(req, res, next) {
    var device_id = req.query.device_id;
    var device_type = req.query.device_type;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/events.csv";

    if(!fs.existsSync(file_name)) res.send("");
    var events_data = fs.readFileSync(file_name, 'utf8');

    // Send data
    res.send(events_data);
});

// Set event
router.post('/events/set', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.body.device_id;
    var device_type = req.query.device_type;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/events.csv";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "timestamp,event", "utf8");
    var events_data = fs.appendFileSync(file_name, "\n" + req.body.timestamp + "," + req.body.event, 'utf8');

    // Send data
    res.send({"status": "success"});
});

module.exports = router;