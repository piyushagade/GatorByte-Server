var express = require('express');
var router = express.Router();
const fs = require('fs');
var device_type = "gatorbyte";

// Get all sites
router.get('/get/all', function(req, res, next) {

    var dir_path = "./data" + "/" + device_type;
    var devices_list = [];

    fs.readdir(dir_path, function (err, sites) {
        if (err) { return console.log('Unable to scan directory: ' + err); } 
        sites.forEach(function (site) {
            if(!fs.lstatSync(dir_path + "/" + site).isDirectory()) return;

            try{
                var data = JSON.parse(fs.readFileSync(dir_path + "/" + site + "/site.json", "utf8"));
                devices_list.push(data);
            }
            catch(e) {
                // console.log("site.json not found for " + site);
            }
        });
        res.send(devices_list);
    });
});

// Get a site's data
router.post('/site/get', function(req, res, next) {

    var dir_path = "./data" + "/" + device_type;
    var site = JSON.parse(req.body)["site-id"];
    if(!site) return;

    try{
        var data = JSON.parse(fs.readFileSync(dir_path + "/" + site + "/site.json", "utf8"));
        console.log(data);
        res.send(data)
    }
    catch(e) {
        console.log("site.json not found for " + site);
    };
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

module.exports = router;