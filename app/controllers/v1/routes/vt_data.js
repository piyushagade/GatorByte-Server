var express = require('express');
var router = express.Router();
const fs = require('fs');
var moment = require("moment");
 
// Get data from the data store
router.use('/get', function(req, res, next) {

    // Get headers/params
    var device_type = req.headers["x-device-type"] || req.query.device_type;    
    var device_id = req.headers["x-device-id"] || req.query.device_id;
    var data_type = req.headers['x-data-type'] || req.query.data_type;

    // Return error if sufficient data is not provided
    if(device_type == undefined) { return res.status(400).end("Device type not provided."); };
    if(device_id == undefined) { return res.status(400).end("Device ID not provided."); };
    if(data_type == undefined) { return res.status(400).end("Data type not provided."); };

    // Deduce which file to use
    var file_name = "./vt_data" + "/" + device_id + "/data_" + data_type + "_" + device_id + ".csv";
    
    fs.readFile(file_name, 'utf8',function (err, data) {
        if (err) return res.status(400).end("File not found.");
        res.type('text/plain');
        res.send(data);
    });
});

// Add data to data store
router.post('/:category', function(req, res, next) {
    var data = (req.body);

    var device_type = req.headers["x-device-type"] || req.query.device_type;
    var device_id = req.headers["x-device-id"] || data.device;

    if(device_id == "lab"){
        res.send("true");
        return;
    }

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var data_dir = "./vt_data" + "/" + device_id + "/";
    var file_name = data_dir + "data_" + req.params.category + "_" + device_id + ".csv";
    var size_file_name = data_dir + "size_data.json";
    if (!fs.existsSync("./vt_data" + "/" + device_id)) fs.mkdirSync("./vt_data" + "/" + device_id);

    if(!fs.existsSync(file_name)){
        // Write to file
        try{ fs.writeFile(file_name, data, function (err) { if (err) { console.log(err); return res.status(500).end("false"); } res.send("true"); }); }
        catch(e){ }
    }
    else{
        // Compute size data
        var sizedata = fs.existsSync(size_file_name) ? JSON.parse(fs.readFileSync(size_file_name, "utf8")) : {};
        var size_of_incoming_data = ((new TextEncoder().encode(data)).length) / 1024; // in KB
        var current_month_year =  moment(new Date().getTime()).format("MMMM").toLowerCase() + "-" + moment(new Date().getTime()).format("YYYY").toLowerCase();
        if(!sizedata[current_month_year]) sizedata[current_month_year] = {};
        sizedata[current_month_year]["cummulative-size"] = (sizedata[current_month_year]["cummulative-size"] || 0) + size_of_incoming_data;
        sizedata[current_month_year]["last-updated"] = moment(new Date().getTime()).format("LL");
        fs.writeFileSync(size_file_name, JSON.stringify(sizedata), "utf8");

        console.log("Payload size: " + size_of_incoming_data + " kB");

        // Remove the header line (first line)
        data = data.substring(data.indexOf("\n"), data.length);

        // Append to file
        try{ fs.appendFile(file_name, data, function (err) { if (err) { console.log(err); return res.status(500).end("false"); } res.send("true"); }); }
        catch(e){ }
    }
});


module.exports = router;