var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;


// Set device type
var device_type = "gatorbyte-vt";

// Get data from the data store
router.get('/data/get/', function(req, res, next) {

    // Get headers/params
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    var type = req.query.type;

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };

    // Deduce which file to use
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings" + (type ? "-" + type : "") + ".dat";

    // Check if file exists
    if(!fs.existsSync(file_name)) {
        res.status(400).send({status: "failed", message: "File not found: " + file_name});
        return;
    }
    
    fs.readFile(file_name, 'utf8',function (err, data) {
        if (err) throw err;
        res.send(data);
    });
});

// Add data to data store by POST method
router.post('/data/set', function(req, res, next) {
    var newdata;
    var type = req.query.type;
    if(!type) console.log("Data 'type' missing");
    
    try {
        console.log(req.body.replace(/\n\s*\n/g, '\n'));

        var is_json = false;

        try {
            JSON.parse(req.body.replace(/\n\s*\n/g, '\n'));
            is_json = true;
        }
        catch (e) {
            is_json = false;
        }

        var device_id = req.headers["x-device-id"] || req.query.device_id;
        if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
        var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings" + (type ? "-" + type : "") + ".dat";
        if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);
        if (!fs.existsSync("./data" + "/" + device_type + "/" + device_id)) fs.mkdirSync("./data" + "/" + device_type + "/" + device_id);
        
        
        if (is_json) {
            newdata = JSON.parse(req.body.replace(/\n\s*\n/g, '\n'));
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
        else {
            newdata = req.body.replace(/\n\s*\n/g, '\n');
            if (!fs.existsSync(file_name)) fs.writeFileSync(file_name, "", "utf8");
            
            // Send new data by broadcast to all websites/applications
            if(io) {
                // var header = fs.readFileSync(file_name, 'utf8').split("\n")[0].replace(/^\uFEFF/, '');
                io.to(device_type + "/" + device_id).emit('new-data', newdata);
            }

            // // Update sensors list in site.json if required
            // var sitefile = "./data" + "/" + device_type + "/" + device_id + "/site.json";
            // var sitedata = fs.readFileSync(sitefile, "utf8");
            // sitedata.sensors.forEach(function(sensor, si) {

            // })

            // Append data to file
            try{ fs.appendFileSync(file_name, newdata, function (err) {
                if (err) { console.log(err); res.status(500).end("false"); return; }
                });
            }
            catch(e){ }
            
            res.send("true");
        }
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

// Set control flags
router.get('/control/set', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/control.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");
    var control_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));
    control_data[flag_type] = value;
    fs.writeFileSync(file_name, JSON.stringify(control_data), "utf8");

    res.send("true");
});

// Set log
router.post('/log/set', function(req, res, next) {
    var device_id = req.query.device_id;

    if(io) io.to(device_type + "/" + device_id).emit("log/device", req.body);

    try{
        if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
        var file_name = "./data" + "/" + device_type + "/" + device_id + "/log.csv";

        if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "timestamp,message", "utf8");
        fs.appendFileSync(file_name, "\n" + new Date().getTime() + ",\"" + req.body.replace(/\n/g, ", ") + "\"", "utf8");
    }
    catch(e) {
        console.log(e);
    }

    res.send("true");
});

// Set state flags
router.post('/state/set', function(req, res, next) {
    var device_id = req.query.device_id;
    
    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/state.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");

    req.body = JSON.parse(req.body);
    Object.keys(req.body).forEach(function (key) {
        var state_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        state_data[key] = req.body[key];
        fs.writeFileSync(file_name, JSON.stringify(state_data), "utf8");

        if(io) io.to(device_type + "/" + device_id).emit(key, req.body[key]);
    });

    res.send("true");
});

// Get state flags
router.get('/state/get', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/state.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");
    var state_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));

    // Send control flag
    res.send(flag_type ? state_data[flag_type] : state_data);
});

// Get control flags
router.get('/control/get', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;
    var reset_flag = req.query.reset_flag == "true" || false;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/control.json";

    var control_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));

    // Send control flag
    res.send(control_data[flag_type]);

    // Reset the flag if requested
    if (reset_flag) {
        control_data[flag_type] = "0";
        fs.writeFileSync(file_name, JSON.stringify(control_data), "utf8");
    }
});

// Execute command
router.post('/command/execute', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.body.device_id.trim();
    var command = req.body.command.trim().toLowerCase();

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var control_file_name = "./data" + "/" + device_type + "/" + device_id + "/control.json";
    if(!fs.existsSync(control_file_name)) {res.status(400).send({"status": "failed", "message": "Control file doesn't exist."}); return;}

    if (command.indexOf("set") == 0) {
        command = command.replace("set ", "").trim();

        if(command.split("=").length == 2) {
            var key = command.split("=")[0].trim();
            var value = command.split("=")[1].trim();

            var control_file_data = JSON.parse(fs.readFileSync(control_file_name, "utf8"));

            if (Object.keys(control_file_data).indexOf(key) == -1) { res.status(400).send({"status": "failed", "message": "Invalid command."}); return;}
            control_file_data[key] = value == 1 ? value : 0;
            fs.writeFileSync(control_file_name, JSON.stringify(control_file_data), "utf8");

            // Send data
            res.send({"status": "success"});
        }
        else { res.status(400).send({"status": "failed", "message": "Invalid sentence"}); return; }
    }

    else if (command.indexOf("server") == 0) {
        command = command.replace("server ", "").trim();

        if(command == "restart") {
            require("child_process").exec("forever restartall", (error, stdout, stderr) => {
                if (error) {
                    res.send({"status": "failed", "message": error.message});
                    return;
                }
                if (stderr) {
                    res.send({"status": "failed"});
                    return;
                }

                // Send data
                res.send({"status": "success"});
            });

        }
        else { res.status(400).send({"status": "failed", "message": "Invalid sentence"}); return; }
    }
    else { res.status(400).send({"status": "failed", "message": "Invalid sentence"}); return; }
});

// Get events
router.get('/events/get', function(req, res, next) {
    var device_id = req.query.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/events.csv";

    if(!fs.existsSync(file_name)) res.send("");
    var events_data = fs.readFileSync(file_name, 'utf8');

    // Send data
    res.send(events_data);
});

// Set event
router.post('/events/set', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.body.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/events.csv";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "timestamp,event", "utf8");
    var events_data = fs.appendFileSync(file_name, "\n" + req.body.timestamp + "," + req.body.event, 'utf8');

    // Send data
    res.send({"status": "success"});
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

module.exports = router;