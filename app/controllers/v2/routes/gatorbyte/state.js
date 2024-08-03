var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";

// Set state flags
router.post('/set', function(req, res, next) {
    var device_id = req.query.device_id;
    
    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/state.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");

    req.body = JSON.parse(req.body);
    Object.keys(req.body).forEach(function (key) {
        var state_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        state_data[key] = req.body[key];
        fs.writeFileSync(file_name, JSON.stringify(state_data), "utf8");

        if(io) io.to(device_type + "/" + device_id).emit(key, req.body[key]);
    });

    res.send("true");
});

// Get state flags
router.get('/get', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/state.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");
    var state_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));

    // Send control flag
    res.send(flag_type ? state_data[flag_type] : state_data);
});

module.exports = router;