var express = require('express');
var router = express.Router();
const fs = require('fs');
var mqtt = require("mqtt");
var socket, io;

var client  = mqtt.connect('mqtt.ezbean-lab.com', {
    clientId: "gb-server-mqtt-client",
    username: "pi",
    password: "abe-gb-mqtt",
    port: 1883,
    protocol: 'http'
});

client.on('connect', function () {
    console.log("Connection to broker established successfully");

    // Subscribe to topics
    client.subscribe('test-topic', function (err) {
        if(err) console.log(err);
    });
})

// Event listeners
client.on('message', function (topic, message) {
    console.log(message.toString())
    
    console.log("Sending response");
    client.publish('test-topic-response', "Hello Arduino!");
})