var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";
var socket = require('./socket');
var mqtt = require('./mqtt');
var axios = require('axios');
var multiline = require('multiline');

var validactions = ["set", "unset", "delete", "toggle", "get", "help", "erase", "cache"];

// Execute command
router.post('/execute', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var devicesn = req.body["device-sn"];
    var projectid = req.body["project-id"];
    var devicename = req.query["device-name"];
    var command = req.body.command;

    if (command) command.trim().toLowerCase();
    else {
        sendactionresponse({
            sender: sender,
            res: res,
            response: "No commands sent",
            error: true
        });
    }

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

                        processaction({
                            res: res,
                            projectid: projectid, 
                            devicename: devicename, 
                            command: command
                        });
                    });
                });
    }
    else if (devicename && projectid) {
        processaction({
            res: res,
            projectid: projectid, 
            devicename: devicename, 
            command: command
        });
    }
});

router.execute = (args) => {

    /*
        ! Command format (lowercase enforced)
        > set abc=123       // This will set the variable abc to 123
        > unset abc         // This will unset the variable to null. Alternatively, use 'delete'
        > toggle xyz        // This will toggle the variable from 0 to 1 or 1 to 0
        > get xyz           // This will return the value of the variable
    */

    var sender = args.sender;
    var destination = args.destination;
    var datum = args.message;

    // Get device data
    var devicesn = destination;
    
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
                    
                    processaction({
                        sender: sender,
                        projectid: projectid, 
                        devicename: devicename, 
                        command: datum
                    });

                });
        });

    return true;
}

let sendactionresponse = function (args) {
    var sender = args.sender;
    var res = args.res;
    var response = args.response;
    var error = args.error != undefined ? args.error : false;

    if (sender) {
        socket.publish({
            room: sender,
            topic: "command/response",
            payload: response
        });
    }
    else if (res) {
        res.send( {"status": error ? "error": "success", "payload": response });
    }
}

let processaction = function (args) {
    var res = args.res, sender = args.sender, projectid = args.projectid, devicename = args.devicename, command = args.command;

    // Get the key and value from the payload
    var action = command.indexOf(" ") > -1 ? 
        command.substring(0, command.indexOf(" ")).trim().toLowerCase() :
        command.trim().toLowerCase();
        
    if (validactions.indexOf(action) == -1) { 
        console.log("Invalid action: " + action);
        
        // Return the acknowledgement to the sender
        sendactionresponse({
            sender: sender,
            res: res,
            response: "Invalid command: " + command,
            error: true
        });
        return false;
    }
    var command = command.replace(action + " ", "").trim().toLowerCase();
    var key = (command.split("=")[0] || "").trim();
    var value = (command.split("=")[1] || "").trim();

    // Get the path to the datastore
    var datastore = path.control("gatorbyte", projectid, devicename, "control.json");

    if (action == "help") {
        var message = multiline(function () {/*
            <div style="padding: 6px 14px;">
                <p style="margin-bottom: 10px;">
                    The console can be used to query or update control variables for the GatorByte at selected site. This can also be used to manipulate/configure the server if you have appropriate permissions.
                </p>
                
                <p style="margin-bottom: 4px;">
                    To set the control variables, the input should have two parts- an action and a command.<br>
                    Here are some examples.<br>
                    <ol>
                        <li>set abc=123</li>
                        <li>unset abc</li>
                        <li>toggle xyz</li>
                        <li>get abc</li>
                    </ol>
                </p>
                <p style="margin-bottom: 0px;">Valid control actions</p>
                <ol>
                    <li>set - This command sets a variable to a value</li>
                    <li>unset - This command unsets/deletes a variable</li>
                    <li>delete - This has same effect as unset</li>
                    <li>toggle - This command toggles a variable from 0 to 1 or vice-versa</li>
                    <li>get - This command return the value of a variable</li>
                </ol>

                <p style="margin-bottom: 0px;">Valid server commands</p>
                <ol>
                    <li>cache purge - Turns on development mode on Cloudflare</li>
                    <li>server restart - This command restarts the server process</li>
                    <li>server renew certificates - Renews SSL certificates</li>
                    <li>server stop - Stops the server process. USE THIS WITH CAUTION.</li>
                </ol>
            </div>
        */});
        
        // Return the acknowledgement to the sender
        sendactionresponse({
            sender: sender,
            res: res,
            response: message
        });
    }

    else if (action == "erase") {

        if (command.indexOf("readings") > -1) fs.unlinkSync(path.data("gatorbyte", projectid, devicename, "readings.json"));
        if (command.indexOf("control") > -1) fs.unlinkSync(path.data("gatorbyte", projectid, devicename, "control.json"));
        if (command.indexOf("state") > -1) fs.unlinkSync(path.data("gatorbyte", projectid, devicename, "state.json"));
        if (command.indexOf("log") > -1) fs.unlinkSync(path.data("gatorbyte", projectid, devicename, "log.json"));

        // Return the acknowledgement to the sender
        sendactionresponse({
            sender: sender,
            res: res,
            response: "Data '" + command.trim() + "' deletion was attempted"
        });
    }

    else if (action == "cache") {
        
        if (command.indexOf("purge") > -1) {

            const data = {
                value: command.indexOf("on") > -1 ? "on" : "off"
            };
        
            const options = {
                headers: {
                    'X-Auth-Key': '829e8d0d4df9f3639d4a5d2a9e86cd9cd4652',
                    'X-Auth-Email': 'piyushagade@gmail.com'
                }
            };
        
            const zoneid = "210c2740cca2cfe8fb530246c199a78c";
                
            axios.patch('https://api.cloudflare.com/client/v4/zones/' + zoneid + '/settings/development_mode', data, options)
                .then((response) => {
        
                    if (response.data.success) {
                        var returnobject = {
                            "state": response.data.result.value,
                            "countdown": response.data.result.time_remaining
                        }

                        // Return the acknowledgement to the sender
                        sendactionresponse({
                            sender: sender,
                            res: res,
                            response: "Cloudflare development mode turned " + (command.indexOf("on") > -1 ? "on " : "off.")
                        });
                    }
                    else {
                        res.send( {"status": "error" });
                        
                        // Return the acknowledgement to the sender
                        sendactionresponse({
                            sender: sender,
                            res: res,
                            response: "Cloudflare development mode couldn't be updated."
                        });
                    }
        
                }).catch((err) => {
                    console.error(err);
                    res.status(400).json(err);
                    return;
                });
            }
    }

    else if (action == "set") {
        set.json(datastore, key, value);

        // Return the acknowledgement to the sender
        sendactionresponse({
            sender: sender,
            res: res,
            response: "The variable was set to " + value
        });

        var topic = destination + "::" + "control/update";

        // Send the incoming data to the GatorByte device
        // mqtt.mqttaccessor.publish(topic, payload);
        mqtt.mqttaccessor.publish(topic, "payload");
    }

    else if (action == "unset" || action == "delete") {
        unset.json(datastore, key);

        // Return the acknowledgement to the sender
        sendactionresponse({
            sender: sender,
            res: res,
            response: "The variable was successfully unset"
        });
    }
    
    else if (action == "get") {
        var value = get.json(datastore, key);
        
        // Return the value to the sender
        sendactionresponse({
            sender: sender,
            res: res,
            response: value
        });
    }
}

module.exports = router;