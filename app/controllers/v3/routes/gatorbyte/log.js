var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";
var socket = require('./socket');
var moment = require("moment");

// Set log
router.post('/log/set', function(req, res, next) {
    var device_id = req.query.device_id;

    if(io) io.to(device_type + "/" + device_id).emit("log/device", req.body);

    try{
        if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data."); res.status(400).end(); return; }
        var file_name = "./data" + "/" + device_type + "/" + device_id + "/log.csv";

        if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "timestamp,message", "utf8");
        fs.appendFileSync(file_name, "\n" + new Date().getTime() + ",\"" + req.body.replace(/\n/g, ", ") + "\"", "utf8");
    }
    catch(e) {
        console.log(e);
    }

    res.send("true");
});


// Get log history
router.post('/get', function(req, res, next) {
    req.body = JSON.parse(req.body); 

    var devicesn = req.body["device-sn"];

    var devicesn = req.body["device-sn"];
    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];
    
    if(devicesn && devicesn.length > 0) { 
        // Get device data
        getdevicebysn(devicesn)
            .then(function (devicedata) {
                var deviceuuid = devicedata["UUID"];
                var devicename = devicedata["NAME"];
                var projectuuid = devicedata["PROJECTUUID"];

                // Get project data
                getprojectbyuuid(projectuuid)
                    .then(function (projectdata) {
                        var projectname = projectdata["NAME"];
                        var projectid = projectdata["ID"];
                        
                        var file_name = path.log("gatorbyte", projectid, devicename, "log.json");
                        var logdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

                        res.send({ "status": "success", "payload": logdata });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "log.json");
        var readingsdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        res.send({ "status": "success", "payload": readingsdata });
    }

    else {
        res.status(400).send({ "status": "error", "message": "Device SN, or Device ID and Project ID not sent." });
    }

});


router.message = (mqtt, args) => {

    var datum = args["payload"];
    var sender_device_id = args["sender-device-id"];

    // Get the path to the datastore
    var datastore = path.data("gatorbyte", sender_device_id, "log.json");

    // Append datum to datastore
    append.json(datastore, {
        "message": datum,
        "timestamp": moment.now()
    });
    
    // Send the incoming data by broadcast to all websites/applications
    socket.publish({
        room: args["sender-device-id"],
        topic: "log/message",
        payload: datum
    });

    return true;
}

router.error = (mqtt, obj) => {

    var datum = obj["payload"];
    var sender_device_id = obj["sender-device-id"];

    // Broadcast to web applications
    if(io) io.to(device_type + "/" + sender_device_id).emit("log/error", datum);

    return true;
}

router.set = (object, args) => {

    var datum = c2j(args["payload"]);
    var sender_device_id = args["sender-device-id"];

    return;
   
    // Get the path to the datastore
    var datastore = path.data("gatorbyte", sender_device_id, "readings.json");

    console.log("Saving data in: " + datastore + "\n");

    // Append datum to datastore
    append.json(datastore, datum);

    // Send the incoming data by broadcast to all websites/applications
    socket.publish({
        room: args["sender-device-id"],
        topic: "data/new",
        payload: datum
    });

    return true;
}

module.exports = router;