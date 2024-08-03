var express = require('express');
var router = express.Router();
const fs = require('fs');

// if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition(showPosition);
// } else {

//     console.log("Geolocation is not supported by this browser.");
// }

// function showPosition(position) {
//     console.log(position);
// }

router.begin = (io, socket, mqtt) => {
    const adapter = require('./adapter');

    socket.onAny((topic, message) => {

        /*
            Topic format
            [sender-id]::[adapter-id]::[destination-id]:::[action-string]
 
            Message format
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


router.room = {
    join: function (args) {
        var room = args.message;
        if (!room || room.length == 0) return;
        args.protocol.join(room);
        console.log("Joined room: " + room);
    },
    leave: function (args) {
        var room = args.message;
        if (!room || room.length == 0) return;
        socket.leave(room);
        console.log("Left room: " + room);
    }
}



module.exports = router;