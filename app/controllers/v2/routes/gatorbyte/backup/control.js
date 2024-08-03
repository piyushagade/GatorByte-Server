var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";

// Set control flags
router.get('/control/set', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/control.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");
    var control_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));
    control_data[flag_type] = value;
    fs.writeFileSync(file_name, JSON.stringify(control_data), "utf8");

    res.send("true");
});

// Get control flags
router.get('/control/get', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;
    var reset_flag = req.query.reset_flag == "true" || false;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/control.json";

    var control_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));

    // Send control flag
    res.send(control_data[flag_type]);

    // Reset the flag if requested
    if (reset_flag) {
        control_data[flag_type] = "0";
        fs.writeFileSync(file_name, JSON.stringify(control_data), "utf8");
    }
});

module.exports = router;