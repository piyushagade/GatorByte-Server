var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";

// Set log
router.post('/log/set', function(req, res, next) {
    var device_id = req.query.device_id;

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

router.message = (mqtt, obj) => {

    var datum = obj["payload"];
    var sender_device_id = obj["sender-device-id"];

    // Broadcast to web applications
    if(io) io.to(device_type + "/" + sender_device_id).emit("log/message", datum);

    return true;
}

router.error = (mqtt, obj) => {

    var datum = obj["payload"];
    var sender_device_id = obj["sender-device-id"];

    // Broadcast to web applications
    if(io) io.to(device_type + "/" + sender_device_id).emit("log/error", datum);

    return true;
}


module.exports = router;