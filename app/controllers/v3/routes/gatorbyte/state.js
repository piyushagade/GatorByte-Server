var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket = require('./socket');
var device_type = "gatorbyte";

// Set state flags
router.post('/set', function(req, res, next) {
    var device_id = req.query.device_id;
    var device_type = req.query.device_type;
    
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
router.post('/get', function(req, res, next) {
    req.body = JSON.parse(req.body);

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
                        
                        var file_name = path.state("gatorbyte", projectid, devicename, "state.json");
                        var statedata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

                        res.send({ "status": "success", "payload": statedata });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "state.json");
        var readingsdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        
        res.send({ "status": "success", "payload": readingsdata, "meta": {
            "projectid": projectid,
            "devicename": devicename,
            "path": file_name
        }});
    }

    else {
        res.status(400).send({ "status": "error", "message": "Device SN, or Device ID and Project ID not sent." });
    }
});

// Process reporting of state values on a GatorByte
router.report = (mqtt, obj) => {
    
    var sender_device_sn = obj["sender-device-id"];

    // Enforce JSON object
    try {

        /*
            Fix invalid JSON syntax
            { 
                ...

                "STATE":"3-hr-sample",
         -->    "WLEV":,    
                "TIPS": 4,

                ...
            }
        */
        if (obj["payload"].includes('":,')) {
            obj["payload"] = obj["payload"].replace(/":,/g, '": null,');
        }

        var datum = JSON.parse(obj["payload"]);

        // Get device data
        var devicesn = sender_device_sn;
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
                    
                    // Get the path to the datastore
                    var datastore = path.control("gatorbyte", projectid, devicename  , "state.json");
                    
                    // Get the path to the site config datastore
                    var sitedatastore = path.control("gatorbyte", projectid, devicename  , "site.json");

                    //! Send the incoming data by broadcast to all websites/applications
                    socket.publish({
                        room: sender_device_sn,
                        topic: "state/report",
                        payload: datum
                    });

                    Object.keys(datum).forEach(function (key, ki) {
                        var value = datum[key];
                        set.json(datastore, key, value);
                    });
                });
        });
    }
    catch (e) {
        console.log(e);
    }
}

module.exports = router;