var express = require('express');
var router = express.Router();
const fs = require('fs');
 
// Control endpoint
router.use('/', function(req, res, next) {
    var controls = req.query.type;
    var device_type = req.headers['x-device-type'] || req.query["device_type"];
    var is_gatorbit = device_type == "gatorbit";
    var device_id = req.headers["x-device-id"] || req.query["device_id"];

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };
    
    var file_name = "./control/" + device_type + "/control_" + device_id + ".json";
    
    var obj;
    fs.readFile(file_name, 'utf8', function (err, data) {
        if (err) res.send(err);
        obj = JSON.parse(data);

        // Construct response string
        var result = "[";
        for(var key in obj) result += key + ":" + obj[key] + ",";
        result = result.substring(0, result.length - 1) + "]";
        res.send(JSON.stringify(controls == "all" ? result : obj[controls]));

        // Reset variables after send
        if(req.query.reset == "true"){
            obj["TURN_OFF_FOR"] = 0;
            obj["RESET_CONTROL_VARIABLES"] = 0;
            obj["REBOOT_IN_SAFE_MODE"] = 0;

            fs.writeFile(file_name, JSON.stringify(obj, null, 4));
        }

    });
});

module.exports = router;