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
    calibrate: require("./calibrate")
}

// Begin MQTT client when called
router.begin = () => {
    var self = this;

    //! Approved topics list to subscribe
    self.topics = {
        "gb-aws-server/test": {
            "action": () => { self.client.publish("test", "Hello Arduino!"); }
        },
        "gb-aws-server/data/set": {
            "action": routes.data.set
        },
        "gb-aws-server/control/set": {
            "action": routes.control.set
        },
        "gb-aws-server/control/get": {
            "action": routes.control.get
        },
        "gb-aws-server/log/message": {
            "action": routes.log.message
        },
        "gb-aws-server/log/error": {
            "action": routes.log.error
        },
        "gb-aws-server/calibration/perform": {
            "action": routes.calibrate.perform
        },
        "gb-aws-server/calibration/response": {
            "action": routes.calibrate.response
        }
    }

    
    setTimeout(() => {
        /*
            * The delay is needed for MQTT to connect to the broker without errors.
        */

        //! MQTT client configuration
        self.client  = mqtt.connect(config.url, {
            clientId: "api-v2-gatorbyte-mqtt-client",
            username: config.username,
            password: config.password,
            port: config.port,
            protocol: config.protocol
        });

        //! Listener -  When this client connects to the broker
        self.client.on('connect', function () {
            console.log("GatorByte MQTT client (api-v2-gatorbyte-mqtt-client) is now connected to Broker.");
        
            // Subscribe to topics in the approved topics list
            Object.keys(self.topics).forEach((name, ti) => {
                if(!name) return;
                self.client.subscribe(name, function (err) { if(err) console.log(err); });
            });
        });
        
        //! Listener - When a message is received
        self.client.on('message', function (topic, message) {

            /* 
                ! Incoming message format
                [sender_device_id]::[target_device_id (optional)]:::[payload]:::[request_ack (optional)]
            */

            // If topic isn't in the approved topics list, return.
            if (!self.topics[topic]) return;

                // Parse message
                var tokens = message.toString().split(":::");
                var sender_device_id = tokens[0].split("::")[0];
                var target_device_id = tokens[0].split("::")[1];
                
                // If device id is not set, return.
                if (!sender_device_id) { console.log("Device id not sent. Please add \"device\" key to the data."); return false; }
                
                // Take action (call function)
                if (self.topics[topic].action && typeof self.topics[topic].action == "function") {
                    var payload = tokens[1];
                    var ack = tokens[2] == "false" ? false : true
                    if(sender_device_id && payload)
                        self.topics[topic].action(self, {
                            "topic": topic.toString(),
                            "sender-device-id": sender_device_id,
                            "target-device-id": target_device_id,
                            "payload": payload,
                            "send-ack": ack
                        });
                    else {
                        console.log("Incorrect incoming message format. The message should be in the following format:");
                        console.log("[sender_device_id]::[target_device_id (optional)]:::[payload]:::[request_ack (optional)]");
                    }
                }
        });

        //! Wrapper - Publish to a topic
        self.publish = (topic, message) => {
            if (!topic || topic.length == 0) { console.error("'topic' string is empty/null."); return; }
            if (!message || message.length == 0) { console.error("'message' string is empty/null."); return; }
            
            self.client.publish(topic, message);
        }

    }, 500);

    return self;
};

module.exports = router;