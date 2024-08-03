var express = require('express');
var router = express.Router();
const fs = require('fs');

var routes = {
    data: require("./data"),
    command: require("./command"),
    control: require("./control"),
    events: require("./events"),
    log: require("./log"),
    state: require("./state"),
    socket: require("./socket"),
    calibrate: require("./calibrate")
}

//! Approved topics list to subscribe
var actions = {
    "data/set": {
        "action": routes.data.set
    },
    "control/set": {
        "action": routes.control.set
    },
    "control/get": {
        "action": routes.control.get
    },
    "log/message": {
        "action": routes.log.message
    },
    "log/error": {
        "action": routes.log.error
    },
    "calibration/perform": {
        "protocol": "mqtt",
        "action": routes.calibrate.perform
    },
    "calibration/response": {
        "protocol": "socket",
        "action": routes.calibrate.response
    },
    "room/createorjoin": {
        "protocol": "socket",
        "action": routes.socket.room.join
    },
}

router.process = (args) => {

    var topic = args.topic;
    var message = args.message;
    var socket = args.socket;
    var mqtt = args.mqtt;
    
    var sender_id = topic.split(":::")[0].split("::")[0];
    var destination_id = topic.split(":::")[0].split("::")[2];
    var action_string = topic.split(":::")[1];
    var payload_string = message;

    if (actions[action_string]) {
        if (actions[action_string].protocol == "socket") {
            actions[action_string].action({
                protocol: socket,
                topic: topic,
                message: payload_string
            })
        }
    }
    else if (actions[action_string]) {
        if (actions[action_string].protocol == "mqtt") {

            console.log(action_string);
            
            // self.actions[action_string].action({
            //     protocol: mqtt,
            //     topic: 
            // })
        }
    }

}

router.tosocket = (socket, obj) => {
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

   var datum = c2j(obj["payload"]);
   var sender_device_id = obj["sender-device-id"];
   
    // Get the path to the datastore
    var datastore = path.data("gatorbyte", sender_device_id, "readings.json");

    // Append datum to datastore
    append.json(datastore, datum);

    // Send the incoming data by broadcast to all websites/applications
    if (io) io.to(device_type + "/" + sender_device_id).emit(obj.topic, JSON.stringify(datum));

    return true;
}



module.exports = router;