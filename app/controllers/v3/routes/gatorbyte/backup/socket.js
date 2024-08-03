var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";

router.begin = (ioi, sckt) => {
    socket = sckt;
    io = ioi;

    // //! Test
    // socket.on("test", data => {
    //     io.in(device_type + "/swb").emit('test', "test success");
    //     console.log("Test payload:" + data);
    // });
    
    // Join listen/server/log
    socket.on("join-server-room-request", (data) => {
        socket.emit('join-server-room-response', data);
        socket.join("server");
    });
    
    // Join room request
    socket.on("join-room-request", data => {
        socket.emit('join-room-response', data);
        socket.join(data);
    });
    
    // Leave room request
    socket.on("leave-room-request", data => {
        socket.emit('leave-room-response', data);
        socket.leave(data);
    });
};

module.exports = router;