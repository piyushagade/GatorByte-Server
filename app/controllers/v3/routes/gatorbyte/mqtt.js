var express = require('express');
var router = express.Router();
const fs = require('fs');
var mqtt = require("mqtt");
var config = require(process.cwd() + "/config/mqtt.json");

var routes = {
    data: require("./data"),
    command: require("./command"),
    control: require("./control"),
    events: require("./events"),
    log: require("./log"),
    state: require("./state"),
    calibrate: require("./calibrate"),
    fault: require("./fault"),
}

// Begin MQTT client when called
router.begin = (args) => {
    var self = this;

    //! MQTT client configuration
    self.client  = mqtt.connect(config.url, {
        clientId: "api-v3-gatorbyte-mqtt-client",
        username: config.username,
        password: config.password,
        port: config.port,
        protocol: config.protocol
    });

    //! Approved MQTT topics that a GatorByte device can publish/subscribe to
    self.topics = {
        "gb-server::test": {
            "action": () => { console.log("Test topic received");self.client.publish("test", "Hello Arduino!"); }
        },
        "gb-server::data/set": {
            "action": routes.data.set
        },
        "gb-server::data/queue": {
            "action": routes.data.queue
        },
        "gb-server::control/set": {
            "action": routes.control.set
        },
        "gb-server::control/get": {
            "action": routes.control.get
        },
        "gb-server::control/report": {
            "action": routes.control.report
        },
        "gb-server::state/report": {
            "action": routes.state.report
        },
        "gb-server::log/message": {
            "action": routes.log.message
        },
        "gb-server::log/error": {
            "action": routes.log.error
        },
        "gb-server::command/set": {
            "action": routes.command.set
        },
        "gb-server::calibration/perform": {
            "action": routes.calibrate.perform
        },
        "gb-server::calibration/response": {
            "action": routes.calibrate.response
        },
        "gb-server::/fault/report": {
            "action": routes.fault.report
        }
    }
    
    //! Listener -  When this client connects to the broker
    self.client.on('connect', function () {
        console.log("GatorByte MQTT client (api-v3-gatorbyte-mqtt-client) is now connected to Broker.");
    
        // Subscribe to topics in the approved topics list
        Object.keys(self.topics).forEach((name, ti) => {
            if(!name) return;
            self.client.subscribe(name, function (err) { if(err) console.log(err); });
        });

        router.mqttaccessor = self;
    });
    
    //! Listener - When a message is received
    self.client.on('message', function (topic, message) {

        console.log("\nNew incoming message.");
        console.log("Topic: " + topic.toString());
        console.log("Payload: " + message.toString());
        console.log("");

        /* 
            ! Incoming topic format
            [server_device_id]::[action]/[sub_action]
        
            ! Incoming message format
            [sender_device_id]::[target_device_id (optional)]::[data_unique_id(optional)]:::[payload]:::[request_ack (optional)]
        */

        //! If topic isn't in the approved topics list, return.
        if (!self.topics[topic]) return;

        //! Parse message
        var tokens = message.toString().split(":::");
        var sender_device_sn = tokens[0].split("::")[0];
        var target_device_id = tokens[0].split("::")[1];
        var data_unique_id = tokens[0].split("::")[2];

        //! If device SN is not provided, return.
        if (!sender_device_sn) { console.log("Device id not sent. Please add \"device\" key to the data."); return false; }

        //! Take action (call function)
        if (self.topics[topic].action && typeof self.topics[topic].action == "function") {
            
            var payload = tokens[1];
            var ack = tokens[2] == "false" ? false : true
            if(sender_device_sn && payload) {

                self.topics[topic].action(self, {
                    "topic": topic.toString(),
                    "sender-device-id": sender_device_sn,
                    "target-device-id": target_device_id,
                    "payload": payload,
                    "send-ack": ack,
                    "id": data_unique_id
                });
            }
            else if (!payload) {
                console.log("Incorrect incoming message format. Payload not sent.\nThe correct format is:");
                console.log("[sender_device_sn]::[target_device_id (optional)]:::[payload]:::[request_ack (optional)]");
            }
            else {
                console.log("Incorrect incoming message format. The message should be in the following format:");
                console.log("[sender_device_sn]::[target_device_id (optional)]:::[payload]:::[request_ack (optional)]");
            }
        }
        else {
            console.log("Invalid action requested: " + topic + " by " + sender_device_sn);
            return;
        }
    });

    //! Wrapper - Publish to a topic
    self.publish = (topic, message) => {
        
        /* 
            ! Outgoing topic format
            [target_device_id]::[action]/[sub_action]
        
            ! Incoming message format
            [payload]:::[request_ack (optional)]
        */


        if (!topic || topic.length == 0) { console.error("'topic' string is empty/null."); return; }
        if (!message || message.length == 0) { console.error("'message' string is empty/null."); return; }

        console.log("Publishing to topic: " + topic);
        
        self.client.publish(topic, message, {qos: 1, retain: false});
    } 

    return self;
};

module.exports = router;