var express = require('express');
var router = express.Router();
const fs = require('fs');
var io, socket;

// if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition(showPosition);
// } else {

//     console.log("Geolocation is not supported by this browser.");
// }

// function showPosition(position) {
//     console.log(position);
// }

router.begin = (_io, _socket, mqtt) => {
    const adapter = require('./adapter');
    io = _io;
    socket = _socket;

    socket.onAny((topic, message) => {

        /*
            ! Topic format
            [sender-id]::[adapter-id]::[destination-id]:::[action-string]
 
            ! Message format
            [payload-string]
        */

        adapter.process({
            topic: topic,
            message: message,
            socket: socket,
            mqtt: mqtt
        });

    });
};

router.publish = (args) => {
    if (!io) return;
    io.to(args.room).emit(args.topic, typeof args.payload == "object" ? JSON.stringify(args.payload) : args.payload);
    console.log("Broadcasting to SocketIO room: " + args.room);
    console.log("Topic: " + args.topic);
    // console.log("Payload: " + JSON.stringify(args.payload));
};

router.room = {
    join: function (args) {
        var room = args.message;
        if (!room || room.length == 0) return;
        args.protocol.join(room);
        console.log("Joined room: " + room);

        io.to(room).emit("room/join/response", {
            "success": true,
            "room": room
        });
    },
    leave: function (args) {
        var room = args.message;
        if (!room || room.length == 0) return;
        socket.leave(room);
        console.log("Left room: " + room);

        io.to(room).emit("room/leave/response", {
            "success": true,
            "room": room
        });
    }
}

module.exports = router;