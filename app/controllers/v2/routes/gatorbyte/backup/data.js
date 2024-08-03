var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;

var device_type = "gatorbyte";

// Get data from the data store
router.get('/data/get/', function(req, res, next) {

    // Get headers/params
    var device_id = req.headers["x-device-id"] || req.query.device_id;

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };

    // Deduce which file to use
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.json";
    
    // Check if file exists
    if(!fs.existsSync(file_name)) {
        resstatus(400).send({status: "failed", message: "File not found: " + file_name});
        return;
    }
    
    fs.readFile(file_name, 'utf8',function (err, data) {
        if (err) throw err;
        res.send(JSON.parse(data));
    });
});

// Add data to data store by POST method
router.post('/data/set/', function(req, res, next) {
    var newdata;
    try {
        console.log(req.body.replace(/\n\s*\n/g, '\n'));
        
        newdata = JSON.parse(req.body.replace(/\n\s*\n/g, '\n'));
        var device_id = req.headers["x-device-id"] || req.query.device_id;
        if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
        var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.json";
        if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);
        if (!fs.existsSync("./data" + "/" + device_type + "/" + device_id)) fs.mkdirSync("./data" + "/" + device_type + "/" + device_id);
        if (!fs.existsSync(file_name)) fs.writeFileSync(file_name, JSON.stringify([]), "utf8");
        
        // Send new data by broadcast to all websites/applications
        if(io) {
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
    
        // Append data to file
        try{ fs.writeFileSync(file_name, JSON.stringify(alldata), function (err) { 
            if (err) { console.log(err); res.status(500).end("false"); return; } 
            }); 
        }
        catch(e){ }
        
        res.send("true");
    }
    catch (e) {
        // Malformed JSON
        console.log(e);
        res.status(400).end("false"); return;
    }
});

// Update a datapoint by POST method
router.post('/data/update', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.headers["x-device-id"] || req.body.device_id;
    
    var timestamp = req.body.timestamp;
    var new_height = req.body.height;

    if(!device_id){ res.status(500).json({"status": "error", "message": "Device id not sent. Please add \"device\" key to the data."});return; }
    if(!timestamp){ res.status(500).json({"status": "error", "message": "timestamp not provided."});return; }
    if(!new_height){ res.status(500).json({"status": "error", "message": "timestamp not provided."});return; }

    var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.csv";
    if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);

    if(!fs.existsSync(file_name)){
        res.status(500).json({"status": "error", "message": "Data file not found."}); return;
    }
    else{
        fs.readFile(file_name, "utf8", function (err, file_data ) { 
            var file_array = file_data.split("\n");
            var index_timestamp, index_height;
            file_array.forEach (function (row, index) {
                if(index == 0) {
                    index_timestamp = row.trim().toLowerCase().split(",").indexOf("timestamp");
                    index_height = row.trim().toLowerCase().split(",").indexOf("height");
                }
                else if (index_timestamp > -1 && index_height > -1) {
                    if(row.split(",")[index_timestamp] == timestamp) {
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

router.onConnection = (ioi, sckt) => {
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

router.set = (mqtt, data) => {
    console.log("New data: " + data);
}

module.exports = router;