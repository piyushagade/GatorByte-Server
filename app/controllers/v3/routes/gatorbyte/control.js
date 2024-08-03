var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket = require('./socket');
var device_type = "gatorbyte";

// Get all control flags from server's copy
router.post('/get', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var devicesn = req.body["device-sn"];
    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];
    var simplifyresponse = req.body["simplify"] == "true";
    
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
                        
                        var file_name = path.control("gatorbyte", projectid, devicename, "control.json");
                        var controldata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

                        if (simplifyresponse) res.send(controldata);
                        else res.send({ "status": "success", "payload": controldata });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "control.json");
        var readingsdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

        res.send({ "status": "success", "payload": readingsdata, "meta": {
            "projectid": projectid,
            "devicename": devicename,
            "path": file_name
        }});
    }

    else {
        
        if (simplifyresponse) res.status(400).send("error");
        else res.status(400).send({ "status": "error", "message": "Device SN, or Device ID and Project ID not sent." });
    }

});

// Get control flag by key from server's copy
router.post('/get/bykey', function(req, res, next) {
    req.body = JSON.parse(req.body);
    headers = req.headers;

    var devicesn = req.body["device-sn"];
    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];
    var key = req.body["key"];
    var simplifyresponse = req.body["simplify"] == true || req.body["simplify"] == "true";

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
                        
                        var file_name = path.control("gatorbyte", projectid, devicename, "control.json");
                        var controldata = JSON.parse(fs.readFileSync(file_name, 'utf8'));
                        var value = controldata[key];

                        if (simplifyresponse) res.send(value);
                        else res.send({ "status": "success", "payload": value });
                    })
                    .catch(function (err) {
                        if (simplifyresponse) res.send("error");
                        else res.send({ "status": "error", "object": err });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "control.json");
        var controldata = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        var value = controldata[key] || "null";

        res.send({ "status": "success", "payload": value, "meta": {
            "projectid": projectid,
            "devicename": devicename,
            "path": file_name
        }});
    }

    else {
        
        if (simplifyresponse) res.status(400).send("error");
        else res.status(400).send({ "status": "error", "message": "Device SN, or Device ID and Project ID not sent." });
    }

});

router.set = (args) => {

    /*
        ! Control command format
        > set abc=123       // This will set the variable abc to 123
        > unset abc         // This will unset the variable to null
        > toggle xyz        // This will toggle the variable from 0 to 1 or 1 to 0
        > value xyz         // This will return the value of the variable
    */

    var sender_device_id = args.sender;
    var sender_device_sn = args["sender-device-id"];
    var datum = args.message;

    // Get the key and value from the payload
    var key = datum.split("::")[0];
    var value = datum.split("::")[1];

    // Get the path to the datastore
    var datastore = path.control("gatorbyte", sender_device_id, "control.json");

    // Update the datastore
    set.json(datastore, key, value);

    return true;
}

// Get the requested control variable
router.get = (mqtt, obj) => {
    
    var sender_device_sn = obj["sender-device-id"];
    
    try {
        var datum = obj["payload"];

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

                        // Get the key from the payload
                        var key = datum.split("::")[0];

                        // Get the path to the datastore
                        var datastore = path.control("gatorbyte", projectid, devicename, "control.json");

                        // console.log(fs.readFileSync(datastore, "utf8"));
                        // console.log(get.json(datastore, key));

                        // Get value from the datastore and publish it to the GatorByte device
                        mqtt.publish(sender_device_sn + "::" + "control/response/single", key + "=" + get.json(datastore, key).toString());
                    });
            });
    }
    catch (e) {
        console.log(e);
    }
}

// Process reporting of control variable values on a GatorByte
router.report = (mqtt, obj) => {
    
    var sender_device_sn = obj["sender-device-id"];

    try {
        // Enforce JSON object
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
                    var datastore = path.control("gatorbyte", projectid, devicename, "control.json");
                    
                    // Get the path to the site config datastore
                    var sitedatastore = path.control("gatorbyte", projectid, devicename, "site.json");

                    //! Send the incoming data by broadcast to all websites/applications
                    socket.publish({
                        room: sender_device_sn,
                        topic: "control/report",
                        payload: datum
                    });

                    //! Read site config data
                    var sitedata = JSON.parse(fs.readFileSync(sitedatastore, "utf-8"));
                    
                    // Create control subobject
                    if (!sitedata["CONTROL"]) sitedata["CONTROL"] = [];

                    Object.keys(datum).forEach(function (key, ki) {
                        var value = datum[key];
                        set.json(datastore, key, value);

                        var found = false;
                        sitedata["CONTROL"].forEach(obj => {
                            if (obj.key == key) found = true;
                        });

                        if (!found) {
                            sitedata["CONTROL"].push({
                                "key": key,
                                "name": key.replace(/_/g, " ").replace(/-/g, " "),
                                "unit": "",
                                "type": "",
                                "format": "",
                                "description": ""
                            });
                        }
                    });

                    //! Add control variables to the site config data as well
                    fs.writeFileSync(sitedatastore, JSON.stringify(sitedata), "utf-8");
                });
        });
    }
    catch (e) {
        console.log(e);
    }
}

// Process updating of control variable values from the dashboard to a GatorByte
router.update = (obj) => {

    try {
        var sender_device_id = obj["sender"];
        var destination_device_id = obj["destination"];
        var datum = typeof obj["message"]  == "string" ? JSON.parse(obj["message"]) : obj["message"];

        // Get device data
        var devicesn = destination_device_id;

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
                        var datastore = path.control("gatorbyte", projectid, devicename, "control.json");

                        // Update the local copy
                        Object.keys(datum).forEach(function (key, ki) {
                            var value = datum[key];
                            set.json(datastore, key, value);
                        });

                        // Send to the destination GatorByte
                        var topic = destination_device_id + "::" + "control/update";
                        var result = "";

                        Object.keys(datum).forEach(function (key, ki) {
                            var value = datum[key];
                            result += key + "=" + value + ",";
                        });
                        result = result.substring(0, result.length - 1);

                        // Send the incoming data to the GatorByte device
                        var mqtt = require('./mqtt');
                        mqtt.mqttaccessor.publish(topic, result); 
                    });
            })
            .catch (function (err) {
                
            });
    }
    catch (e) {
        console.log(e);
    }
}

module.exports = router;