var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;

// Get data from the data store
router.get('/data/get/', function(req, res, next) {

    // Get headers/params
    var device_type = "gatorbit";
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    var last_received_data_timestamp = req.headers['x-last-data-point-timestamp'] || req.query.last_data_point_timestamp;

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };

    // Deduce which file to use
    var file_name = "./data" + "/" + device_type + "/" + device_id + (req.query.reference ? "/reference.csv" : "/readings.csv");
    
    // Check if file exists
    if(!fs.existsSync(file_name)) {
        resstatus(400).send({status: "failed", message: "File not found: " + file_name});
        return;
    }
    
    // Get CSV header
    var headers_row;
    headers_row = fs.readFileSync(file_name, 'utf8').split("\n")[0];
    headers_row = headers_row;

    // Send only the data that was recoreded after last_received_data_timestamp
    if(last_received_data_timestamp){
        var read_stream = fs.createReadStream(file_name, 'utf8');
        var data = "";
        var append_to_data = false;
        read_stream.on('data', function(chunk) {
            if (chunk.indexOf(last_received_data_timestamp) > -1) append_to_data = true;
            if (append_to_data){
                var rows = chunk.split(/\r?\n/);
                rows.forEach(row => {
                    var values = row.split(",");
                    var timestamp = values[0];
                    if(parseInt(timestamp) > parseInt(last_received_data_timestamp)) data += row + "\n";
                });
            } 
        }).on('end', function() {
            res.type('text/plain');
            res.send(headers_row + (data.length ? "\n" + data.substring(0, data.length - 1) : ""))
        });
    }
    // Send all data
    else
        fs.readFile(file_name, 'utf8',function (err, data) {
            if (err) throw err;
            res.type('text/plain');
            res.send(data);
        });
});

// Get burst data from the data store
router.get('/burst/get/', function(req, res, next) {
    // Get headers/params
    var device_type = "gatorbit";
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    var last_received_data_timestamp = req.headers['x-last-data-point-timestamp'] || req.query.last_data_point_timestamp;
    var timestamp = req.headers['x-timestamp'] || req.query.timestamp;

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };

    // Deduce which file to use
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/burst.csv";
    
    var headers_row;
    if(device_type == "gatorbit"){
        // Get CSV header
        headers_row = fs.readFileSync(file_name, 'utf8').split("\n")[0];
        headers_row = headers_row;

        // Send only the data that was recoreded after last_received_data_timestamp
        if(last_received_data_timestamp){
            var read_stream = fs.createReadStream(file_name, 'utf8');
            var data = "";
            var append_to_data = false;
            read_stream.on('data', function(chunk) {
                if (chunk.indexOf(last_received_data_timestamp) > -1) append_to_data = true;
                if (append_to_data){
                    var rows = chunk.split(/\r?\n/);
                    rows.forEach(row => {
                        var values = row.split(",");
                        var timestamp = values[0];
                        if(parseInt(timestamp) > parseInt(last_received_data_timestamp)) data += row + "\n";
                    });
                } 
            }).on('end', function() {
                res.type('text/plain');
                res.send(headers_row + (data.length ? "\n" + data.substring(0, data.length - 1) : ""))
            });
        }
        else if (timestamp) {
            var read_stream = fs.createReadStream(file_name, 'utf8');
            var data = "";
            var append_to_data = false;
            read_stream.on('data', function(chunk) {
                if (chunk.indexOf(timestamp) > -1) append_to_data = true;
                if (append_to_data){
                    var rows = chunk.split(/\r?\n/);
                    rows.forEach(row => {
                        var values = row.split(",");
                        var row_timestamp = values[0];
                        if(parseInt(row_timestamp) == parseInt(timestamp)) {
                            data = row;
                        }
                    });
                } 
            }).on('end', function() {
                res.type('text/plain');
                res.send(headers_row + (data.length ? "\n" + data.substring(0, data.length - 1) : ""))
            });
        }
        // Send all data
        else
            fs.readFile(file_name, 'utf8',function (err, data) {
                if (err) throw err;
                res.type('text/plain');
                res.send(data);
            });
    }
});

// Add data to data store by GET method
router.get('/data/set/:data', function(req, res, next) {
    var data =  JSON.parse(req.params.data);
    var device_type = "gatorbit";
    var device_id = data.device;

    console.log(device_id);

    if(device_id == "lab"){
        res.send("true");
        return;
    }

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.csv";

    // Construct data string
    if (device_type == "gatorbit") data = "\n" + data["utc-timestamp"] + "," + data["batt-volt"] + "," + data["batt-level"] + "," + data.height;
    else if(device_type == "gatorbyte") data = '\n' + data.do + ',' + data.ec + ',' + data.ph + ',' + data.rtd + ',' + data.location.split(",")[0] + ',' + data.location.split(",")[1] + ',' + data["batt-volt"] + ',' + data["batt-level"] + ',' + data["utc-timestamp"];

    // Write to file
    try{ fs.appendFile(file_name, data, function (err) { if (err) { console.log(err); return res.status(500).end("false"); } res.send("true"); }); }
    catch(e){ }
});

// Add data to data store by POST method
router.post('/data/set/', function(req, res, next) {
    req.body = req.body.replace(/\n\s*\n/g, '\n');
    var device_type = "gatorbit";
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    
    console.log(device_id);
    
    req.body.split("\n").forEach(function(row) {
        if(row.length > 0){
            var data = JSON.parse(row);

            if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
            var file_name = "./data" + "/" + device_type + "/" + device_id + "/readings.csv";
            if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);
            
            // Extract data
            data = "\n" + data["utc-timestamp"] + "," + data["batt-volt"] + "," + data["batt-level"] + "," + data.height + ",\"" + data.source + "\",\"" + data.state + "\"";
            
            console.log(file_name);

            if(io) {
                var header = fs.readFileSync(file_name, 'utf8').split("\n")[0].replace(/^\uFEFF/, '');
                io.to("gatorbit/" + device_id).emit('new-data', header + data);
            }

            if(!fs.existsSync(file_name)){
                console.log("Here 1");

                // Write to file
                try{ fs.writeFile(file_name, data, function (err) { if (err) { console.log(err); return res.status(500).end("false"); return; } }); }
                catch(e){ }
            }
            else{
                console.log("Here 2");

                // Append to file
                try{ fs.appendFile(file_name, data, function (err) { if (err) { console.log(err); res.status(500).end("false"); return; }}); }
                catch(e){ 
                    console.log("Here 3");
                }
            }

        }
    });

    setTimeout(() => {
        res.send("true");
    }, 1000);
});

// Update a datapoint by POST method
router.post('/data/update', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_type = "gatorbit";
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

// Add burst data to data store by POST method
router.post('/burst/set/', function(req, res, next) {
    req.body = "\n" + req.body.replace(/\n\s*\n/g, '\n');
    if(req.body[req.body.length - 1] == ",") req.body = req.body.substr(0, req.body.length - 1);
    
    var device_type = "gatorbit";
    var device_id = req.headers["x-device-id"] || req.query.device_id;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/burst.csv";
    if (!fs.existsSync("./data" + "/" + device_type)) fs.mkdirSync("./data" + "/" + device_type);
    if(!fs.existsSync(file_name)){
        // Write to file
        try{ fs.writeFile(file_name, req.body, function (err) { if (err) { console.log(err); return res.status(500).end("false"); return; } }); }
        catch(e){ }
    }
    else{
        // Append to file
        try{ fs.appendFile(file_name, req.body, function (err) { if (err) { console.log(err); res.status(500).end("false"); return; } }); }
        catch(e){ }
    }

    setTimeout(() => {
        res.send("true");
    }, 1000);
});

// Set control flags
router.get('/control/set', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_type = "gatorbit";
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
    var device_type = "gatorbit";
    var device_id = req.query.device_id;

    if(io) io.to("gatorbit/" + device_id).emit("log/device", req.body);

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
    var device_type = "gatorbit";
    var device_id = req.query.device_id;
    
    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/state.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");

    req.body = JSON.parse(req.body);
    Object.keys(req.body).forEach(function (key) {
        var state_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));
        state_data[key] = req.body[key];
        fs.writeFileSync(file_name, JSON.stringify(state_data), "utf8");

        if(io) io.to("gatorbit/" + device_id).emit(key, req.body[key]);
    });

    res.send("true");
});

// Get state flags
router.get('/state/get', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_type = "gatorbit";
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
    var device_type = "gatorbit";
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

    var device_type = "gatorbit";
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
    var device_type = "gatorbit";
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

    var device_type = "gatorbit";
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

    //! Test
    socket.on("test", data => {
        io.in("gatorbit/swb").emit('test', "test success");
        console.log("Test payload:" + data);
    });
    
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