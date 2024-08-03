var express = require('express');
var router = express.Router();
const fs = require('fs');
const { get } = require('./command.js');
const functions = require('./functions.js')();
var socket = require('./socket');
var groupme = require('./groupme');
var mqttmodule = require('./mqtt');
var multiline = require('multiline');
var moment = require('moment');
var pathlib = require('path');

var device_type = "gatorbyte";

// Get data from the data store
// TODO: Deprecate
router.get('/get', function (req, res, next) {

    // Check if the request if for the primary data or the reference data (or any other type)
    var data_type = (req.headers["x-data-type"] || req.query.data_type) || "primary";

    // Get headers/params
    var device_id = (req.headers["x-device-id"] || req.query.device_id).trim();
    // var device_type = req.query.device_type;

    // If device id is not sent, return.
    if (!device_id) { console.log("Device id not sent. Please add \"device\" key to the data. Please reach out to ezbean@ufl.edu for more information on this issue."); return false; }

    // Create a variable for the file's name (the datastore)
    var filename = "./data" + "/" + device_type + "/" + device_id + (data_type == "primary" ? "/readings.json" : "/readings-" + data_type + ".json");

    // If the data file doesn't exist
    if (!fs.existsSync(filename)) { console.log("File " + filename + " does not exist. Please reach out to ezbean@ufl.edu for more information on this issue."); res.end(); return; }

    // Read the datastore
    var data = JSON.parse(fs.readFileSync(filename, "utf8"));

    // Send the data
    res.send(data);
    
});

// Get data
router.post('/get', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var devicesn = req.body["device-sn"];
    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];
    
    if(devicesn && devicesn.length > 0) { 

        // Get device's data
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
                        
                        var reading_file_name = path.data("gatorbyte", projectid, devicename, "readings.json");
                        var readingsdata = JSON.parse(fs.readFileSync(reading_file_name, 'utf8'));
                        
                        res.send({ "status": "success", 
                            "payload": readingsdata,
                            "meta": {
                                "projectid": projectid,
                                "devicename": devicename,
                                "path": file_name
                            }
                        });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "readings.json");
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

// Get annotations data
router.post('/annotations/get', function(req, res, next) {
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
                        
                        var annotations_file_name = path.data("gatorbyte", projectid, devicename, "annotations.json");
                        var annotationsdata = JSON.parse(fs.readFileSync(annotations_file_name, 'utf8'));

                        res.send({ "status": "success", 
                            "payload": annotationsdata,
                            "meta": {
                                "projectid": projectid,
                                "devicename": devicename,
                                "path": file_name
                            }
                        });
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "readings.json");
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

// Get reference data from the data store if available
// TODO: Decrepate; Use the /data/get with data_type query in the dashboard before decrepating this end-point
router.get('/reference/get', function (req, res, next) {

    // Get headers/params
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    // var device_type = req.query.device_type;

    // If device id is not setInterval, return.
    if (!device_id) { console.log("Device id not sent. Please add \"device\" key to the data."); return false; }

    // Create a variable for the file's name (the datastore)
    var filename = "./data" + "/" + device_type + "/" + device_id + "/readings-reference.json"

    // If the data file doesn't exist
    if (!fs.existsSync(filename)) { console.log("Reference file " + filename + " does not exist."); res.end(); return; }
    else {
        // Read the datastore
        var data = JSON.parse(fs.readFileSync(filename, "utf8"));

        // Send the data
        res.send(data);
    }
});

// Add data to data store by POST method
router.post('/set', function (req, res, next) {
    
    var newdata;
    try {
        
        // Convert incoming data to JSON object
        try { newdata = JSON.parse(req.body.replace(/\n\s*\n/g, '\n')); }
        catch(e) { c2j(req.body.replace(/\n\s*\n/g, '\n'))}

        var device_id = req.headers["x-device-id"] || req.query.device_id;
        var device_type = req.query.device_type;
        if (!device_id) { console.log("Device id not sent. Please add \"device\" key to the data."); return; }
        var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.json";
        if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);
        if (!fs.existsSync("./data" + "/" + device_type + "/" + device_id)) fs.mkdirSync("./data" + "/" + device_type + "/" + device_id);
        if (!fs.existsSync(file_name)) fs.writeFileSync(file_name, JSON.stringify([]), "utf8");

        // Send new data by broadcast to all websites/applications
        if (io) {
            // var header = fs.readFileSync(file_name, 'utf8').split("\n")[0].replace(/^\uFEFF/, '');
            io.to(device_type + "/" + device_id).emit('new-data', JSON.stringify(newdata));
        }

        // // Update sensors list in site.json if required
        // var sitefile = "./data" + "/" + device_type + "/" + device_id + "/site.json";
        // var sitedata = fs.readFileSync(sitefile, "utf8");
        // sitedata.sensors.forEach(function(sensor, si) {

        // })

        // Read data from file
        var alldata = JSON.parse(fs.readFileSync(file_name, "utf8"));
        alldata.push(newdata);

        // Sort incoming data
        alldata.sort((a, b) => {
            const timestampA = a.TIMESTAMP;
            const timestampB = a.TIMESTAMP;
            return timestampA - timestampB;
        });

        // Append data to file
        try {
            fs.writeFileSync(file_name, JSON.stringify(alldata), function (err) {
                if (err) { console.log(err); res.status(500).end("false"); return; }
            });
        }
        catch (e) { }

        res.send("true");
    }
    catch (e) {
        // Malformed JSON
        console.log(e);
        res.status(400).end("false"); return;
    }
});

// Update a datapoint by POST method
router.post('/data/update', function (req, res, next) {
    if (typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.headers["x-device-id"] || req.body.device_id;
    var device_type = req.query.device_type;

    var timestamp = req.body.timestamp;
    var new_height = req.body.height;

    if (!device_id) { res.status(500).json({ "status": "error", "message": "Device id not sent. Please add \"device\" key to the data." }); return; }
    if (!timestamp) { res.status(500).json({ "status": "error", "message": "timestamp not provided." }); return; }
    if (!new_height) { res.status(500).json({ "status": "error", "message": "timestamp not provided." }); return; }

    var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.csv";
    if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);

    if (!fs.existsSync(file_name)) {
        res.status(500).json({ "status": "error", "message": "Data file not found." }); return;
    }
    else {
        fs.readFile(file_name, "utf8", function (err, file_data) {
            var file_array = file_data.split("\n");
            var index_timestamp, index_height;
            file_array.forEach(function (row, index) {
                if (index == 0) {
                    index_timestamp = row.trim().toLowerCase().split(",").indexOf("timestamp");
                    index_height = row.trim().toLowerCase().split(",").indexOf("height");
                }
                else if (index_timestamp > -1 && index_height > -1) {
                    if (row.split(",")[index_timestamp] == timestamp) {
                        var items = row.split(",");
                        items[index_height] = new_height;
                        row = items.join(",");
                        file_array[index] = row;

                        fs.writeFileSync(file_name, file_array.join("\n"), "utf8");
                    }
                }
            });
        });
    }

    setTimeout(() => {
        res.send("true");
    }, 1000);
});

// Request a data sorting using a field (column) name
router.post('/data/sort', function (req, res, next) {
    if (typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.headers["x-device-id"] || req.body.device_id;
    var device_type = req.query.device_type;
    var field_name = req.query.field_name;

    var datastore = "./data" + "/" + device_type + "/" + device_id + "/readings.json";
    if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);

    if (!fs.existsSync(file_name)) {
        res.status(500).json({ "status": "error", "message": "Data file not found." }); return;
    }
    else {

        var alldata = JSON.parse(fs.readFileSync(datastore, "utf8"));
        var ROWS_TO_SORT = alldata.length < 5 ? alldata.length : 5;
        var sorteddata = alldata.slice(-ROWS_TO_SORT).sort((a, b) => { return b["TIMESTAMP"] > a["TIMESTAMP"] ? -1 : 1 });
        sorteddata = alldata.slice(0, alldata.length - ROWS_TO_SORT).concat(sorteddata);
    }

    setTimeout(() => {
        res.send("true");
    }, 1000);
});

// Check order of data file
router.post('/checkorder', function (req, res, next) {
    if (typeof req.body == "string") req.body = JSON.parse(req.body);

    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];
    var device_type = req.query.device_type || req.headers["x-device-type"] || req.body["device-type"];
    var datastore = pathlib.join(process.cwd(), "data", device_type, projectid, devicename, "readings.json");
    runexternalscript("check-order", datastore)
        .then (function (result) {
            res.send({ "status": "success", "result": JSON.parse(result) });
        })
        .catch (function () {
            res.status(500).send({ "status": "error", "message": "Couldn't run script."});
        })
});

// Check order of data file
router.post('/forceorder', function (req, res, next) {
    if (typeof req.body == "string") req.body = JSON.parse(req.body);

    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];
    var device_type = req.query.device_type || req.headers["x-device-type"] || req.body["device-type"];
    var datastore = pathlib.join(process.cwd(), "data", device_type, projectid, devicename, "readings.json");
    runexternalscript("force-order", datastore)
        .then (function (result) {
            res.send({ "status": "success", "result": result });
        })
        .catch (function () {
            res.status(500).send({ "status": "error", "message": "Couldn't run script."});
        })
});

router.set = (object, args) => {

    /*
        *Steps:
            0. Extract data from message string
            1. Parse JSON/CSV data to JSON
            2. Get device ID
            3. Create file and folders if they don't exist
            4. Append new data to the datastore
            5. Emit SIO event
            6. Send response
    */

    console.log("\nIncoming data from " + args["sender-device-id"]);
    console.log(args["payload"]);

    var datum = c2j(args["payload"]);
    var sender_device_sn = args["sender-device-id"];
    var unique_data_id = args["id"];

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

                    try {
                        var projectname = projectdata["NAME"];
                        var projectid = projectdata["ID"];

                        var file_name = path.state("gatorbyte", projectid, devicename, "state.json");
                        var statedata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

                        // Get the path to the datastore
                        var datastore = path.data("gatorbyte", projectid, devicename, "readings.json");

                        console.log("Saving data in: " + datastore + "\n");

                        // Append the timestamp of when the data was received on the server
                        datum.forEach(function (d) {
                            d["RECEIVED"] = parseInt(moment.now() / 1000).toString();
                        });

                        // Append datum to datastore
                        append.json(datastore, datum);

                        // Send the incoming data by broadcast to all websites/applications
                        socket.publish({
                            room: args["sender-device-id"],
                            topic: "data/new",
                            payload: datum
                        });

                        // Sort the last 5 items of the data in the datastore
                        var alldata = JSON.parse(fs.readFileSync(datastore, "utf8"));
                        var ROWS_TO_SORT = alldata.length < 25 ? alldata.length : 25;
                        var sorteddata = alldata.slice(-ROWS_TO_SORT).sort((a, b) => { return b["TIMESTAMP"] > a["TIMESTAMP"] ? -1 : 1 });
                        sorteddata = alldata.slice(0, alldata.length - ROWS_TO_SORT).concat(sorteddata);

                        // // Send ACK
                        // mqtt.mqttaccessor.publish("gatorbyte/ack", "success");

                        /* 
                            ! Send a groupme message
                            TODO: Get info from config
                        */
                        if (Array.isArray(datum))
                            datum.forEach(row => {
                                groupmepost(projectid, row);
                            });
                        else if (typeof datum == "object") groupmepost(projectid, datum);
                    }
                    catch (e) {
                        console.log(e);
                    }
                });
        });
    return true;
}

function groupmepost (projectid, data) {
    
    if (projectid == "gb-chmd") {
        
        console.log("Sending new sample notification to GroupMe to " + projectid);
        
        var message = "";
        if (data.HOURID == 6) {
            message = multiline(function () {/* 
                The first sample of the treatment cycle (ID: {{RAINID}}) has been taken. Please expect the final sample to be taken 12 hours from now.
            */}, {
                "RAINID": data.RAINID,
                "DEVICEID": data.DEVICEID
            }).trim();
        }
        else if (data.HOURID == 9) {
            message = multiline(function () {/* 
                The second sample of the treatment cycle (ID: {{RAINID}}) has been taken. Please expect the final sample to be taken 12 hours from now.
            */}, {
                "RAINID": data.RAINID,
                "DEVICEID": data.DEVICEID
            }).trim();
        }
        else if (data.HOURID == 100) {

            message = multiline(function () {/* 
                The final sample of the treatment cycle (ID: {{RAINID}}) has been taken. This treatment cycle has all 6 samples. Please collect the samples soon.
            */}, {
                "RAINID": data.RAINID,
                "DEVICEID": data.DEVICEID
            }).trim();
        }
        else if (data.HOURID == 99) {
            message = multiline(function () {/* 
                The final sample of the treatment cycle (ID: {{RAINID}}) has been taken. This treatment cycle does NOT have all six samples. Please collect the samples soon.
            */}, {
                "RAINID": data.RAINID,
                "DEVICEID": data.DEVICEID
            }).trim();
        }

        // Append data
        message += "\n\n" + "Site: " + data.DEVICEID
        message += "\n" + "Rain ID: " + data.RAINID
        // message += "\n" + "Time: " + (moment(parseInt(data.TIMESTAMP) * 1000).format("LLLL"));
        message += "\n" + "Time: " + (moment(moment.now()).format("LLLL"));
        message += "\n\n" + j2c([data]);

        // Post message
        groupme.post(message);
    }
}

(function testpost () {

    groupmepost ({
        "SURVEYID": "gb-chmd",
        "DEVICEID": "gb-chmd-six",
        "TIMESTAMP": "1686274728",
        "TEMP": "29",
        "RH": "59",
        "FLTP": "1",
        "RAINID": "1",
        "HOURID": "99",
        "WLEV": "26"
    });
});

router.queue = (object, args) => {

    /*
        *Steps:
            0. Extract data from message string
            1. Parse JSON/CSV data to JSON
            2. Get device ID
            3. Create file and folders if they don't exist
            4. Append new data to the datastore
            5. Emit SIO event
            6. Send response
    */

    console.log("\nIncoming queue data from " + args["sender-device-id"]);
    console.log(args["payload"]);
    
    var datum = c2j(args["payload"]);
    var sender_device_sn = args["sender-device-id"];
   
    // // Get the path to the datastore
    // var datastore = path.data("gatorbyte", sender_device_sn, "readings.json");

    // console.log("Saving data in: " + datastore + "\n");

    // // Append datum to datastore
    // append.json(datastore, datum);

    // // Send the incoming data by broadcast to all websites/applications
    // socket.publish({
    //     room: args["sender-device-id"],
    //     topic: "data/new",
    //     payload: datum
    // });

    return true;
}

module.exports = router;