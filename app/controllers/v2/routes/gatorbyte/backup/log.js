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

module.exports = router;