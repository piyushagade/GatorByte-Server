var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;

//TODO: Deprecate this line in all .js files
var device_type = "gatorbyte";

// Set log
router.post('/log/set', function(req, res, next) {
    var device_id = req.body.device_id;
    var device_type = req.query.device_type;

    if(io) io.to(device_type + "/" + device_id).emit("log/device", req.body);

    try{
        if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
        var file_name = "./data" + "/" + device_type + "/" + device_id + "/log.csv";

        if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "timestamp,message", "utf8");
        fs.appendFileSync(file_name, "\n" + new Date().getTime() + ",\"" + req.body.replace(/\n/g, ", ") + "\"", "utf8");
    }
    catch(e) {
        console.log(e);
    }

    res.send("true");
});

router.perform = (mqtt, obj) => {

    var datum = obj["payload"];
    var sender_device_id = obj["sender-device-sn"];
    var target_device_id = obj["target-device-id"];

    var sensor = datum.split(":")[0];
    var int = datum.split(":")[1];

    mqtt.publish(target_device_id + "/calibration/perform", sensor + ":" + int);

    return true;
}

//TODO: Incorporate device-type with device-id
// for example 
//      1. gb-lab:gbyte
//      2. swb:gbit
//      3. gb-vt-1:gbytevt
router.response = (mqtt, obj) => {

    var datum = obj["payload"];
    var sender_device_id = obj["sender-device-id"];
    var target_device_id = obj["target-device-id"];

    var sensor = datum.split(":")[0];
    var int = datum.split(":")[1];

    // mqtt.publish(target_device_id + "/calibration/perform", sensor + ":" + int);

    console.log(obj);

    return true;
}

router.error = (mqtt, obj) => {

    var datum = obj["payload"];
    var device_id = obj["device-id"];

    // Broadcast to web applications
    if(io) io.to(device_type + "/" + device_id).emit("log/error", datum);

    return true;
}


module.exports = router;