var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";
var socket = require('./socket');
var moment = require("moment");

// Get all faults' history
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
                        
                        var file_name = path.log("gatorbyte", projectid, devicename, "faults.json");
                        var logdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

                        res.send({ "status": "success", "payload": logdata });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "faults.json");
        var readingsdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        res.send({ "status": "success", "payload": readingsdata });
    }

    else {
        res.status(400).send({ "status": "error", "message": "Device SN, or Device ID and Project ID not sent." });
    }

});

router.report = (mqtt, args) => {

    var datum = args["payload"];
    var sender_device_id = args["sender-device-id"];

    // Get the path to the datastore
    var datastore = path.data("gatorbyte", sender_device_id, "faults.json");

    var faultdevice = datam.split("/")[0] || "unknown";
    var faultcategory = datam.split("/")[1] || "generic";
    var faultstate = datam.split("/")[2] || "failed";

    // Append datum to datastore
    append.json(datastore, {
        "device": faultdevice,
        "category": faultcategory,
        "state": faultstate,
        "cleared": false,
        "timestamp": moment.now()
    });
    
    // Send the incoming data by broadcast to all websites/applications
    socket.publish({
        room: args["sender-device-id"],
        topic: "fault/report",
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