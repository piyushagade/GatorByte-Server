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
    state: require("./state")
}

// Begin MQTT client when called
router.begin = () => {
    var self = this;

    // MQTT client configuration
    self.client  = mqtt.connect(config.url, {
        clientId: "server-gatorbyte",
        username: config.username,
        password: config.password,
        port: config.port,
        protocol: config.protocol
    });

    // Approved topics list
    self.topics = {
        "test": {
            "action": () => { self.client.publish("test", "Hello Arduino!"); }
        },
        "data/set": {
            "action": routes.data.newData
        }
    }
    
    //! Listener -  When this client connects to the broker
    self.client.on('connect', function () {
        console.log("GatorByte MQTT client is now connected to Broker.");
    
        // Subscribe to topics in the approved topics list
        Object.keys(self.topics).forEach((name, ti) => {
            if(!name) return;
            self.client.subscribe(name, function (err) { if(err) console.log(err); });
        });
    });
      
    //! Listener - When a message is received
    self.client.on('message', function (topic, message) {

        // If topic isn't in the approved topics list, return.
        if (!self.topics[topic]) return;

        // Take action (call function)
        if (self.topics[topic].action && typeof self.topics[topic].action == "function") self.topics[topic].action(self, message);

    });

    //! Wrapper - Publish to a topic
    self.publish = (topic, message) => {
        if (!topic || topic.length == 0) { console.error("'topic' string is empty/null."); return; }
        if (!message || message.length == 0) { console.error("'message' string is empty/null."); return; }
        
        self.client.publish(topic, message);
    } 

    return self;
};

module.exports = router;