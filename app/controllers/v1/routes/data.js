var express = require('express');
var router = express.Router();
const fs = require('fs');
 
// Get data from the data store
router.use('/get/', function(req, res, next) {
    // Get headers/params
    var device_type = req.headers["x-device-type"] || req.query.device_type;
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    var last_received_data_timestamp = req.headers['x-last-data-point-timestamp'] || req.query.updates;

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };


    // Deduce which file to use
    var file_name = "./data" + "/" + device_type + "/data_" + device_id + ".csv";
    
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
        // Send all data
        else
            fs.readFile(file_name, 'utf8',function (err, data) {
                if (err) throw err;
                res.type('text/plain');
                res.send(data);
            });
    }
    else if(device_type == "gatorbyte") {
        fs.readFile(file_name, 'utf8',function (err, data) {
            if (err) return res.status(400).end("File not found. Device doesn't exist.");
            res.type('text/plain');
            res.send(data);
        });
    }
});

// Add data to data store
router.use('/set/:data', function(req, res, next) {
    var data =  JSON.parse(req.params.data);
    var device_type = req.headers["x-device-type"] || req.query.device_type;
    var device_id = data.device;

    if(device_id == "lab"){
        res.send("true");
        return;
    }

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" +"/" + device_type + "/data_" + device_id + ".csv";

    // Construct data string
    if (device_type == "gatorbit") data = "\n" + data["utc-timestamp"] + "," + data["batt-volt"] + "," + data["batt-level"] + "," + data.height;
    else if(device_type == "gatorbyte") data = '\n' + data.do + ',' + data.ec + ',' + data.ph + ',' + data.rtd + ',' + data.location.split(",")[0] + ',' + data.location.split(",")[1] + ',' + data["batt-volt"] + ',' + data["batt-level"] + ',' + data["utc-timestamp"];

    // Write to file
    try{ fs.appendFile(file_name, data, function (err) { if (err) { console.log(err); return res.status(500).end("false"); } res.send("true"); }); }
    catch(e){ }
});

module.exports = router;