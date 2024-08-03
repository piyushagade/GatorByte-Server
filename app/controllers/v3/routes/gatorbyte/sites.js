var express = require('express');
var router = express.Router();
const fs = require('fs');
var device_type = "gatorbyte";
const db = require("./db.js");

// Get all sites
router.post('/get/all', function(req, res, next) {

    var email = JSON.parse(req.body.trim())["email"];
    var userid = JSON.parse(req.body.trim())["user-id"];

    // var dir_path = "./data" + "/" + device_type;
    // var devices_list = [];

    // fs.readdir(dir_path, function (err, sites) {
    //     if (err) { return console.log('Unable to scan directory: ' + err); } 
    //     sites.forEach(function (site) {
    //         if(!fs.lstatSync(dir_path + "/" + site).isDirectory()) return;

    //         try{
    //             var data = JSON.parse(fs.readFileSync(dir_path + "/" + site + "/site.json", "utf8"));
    //             devices_list.push(data);
    //         }
    //         catch(e) {
    //             // console.log("site.json not found for " + site);
    //         }
    //     });
    //     res.send(devices_list);
    // });

    // Get the list of sites
    db.exec({
        db: db.instance.sites(req),
        cmd: "SELECT * FROM ALL_DEVICES",
        values: [],
        success: function (devices) {
            db.exec({
                    db: db.instance.sites(req),
                    cmd: "SELECT * FROM DEVICE_ACCESS WHERE USERUUID=?",
                    values: [userid],
                    success: function (accessdata) {
                        res.send({ "status": "success", "payload": {
                            "devices": devices,
                            "access": accessdata,
                        } });
                    },
                    error: function (err) {
                        console.log(err);
                        return;
                    }
                });
        },
        error: function (err) {
            console.log(err);
            return;
        }
    });
});

// Get a site's dashboard configuration data
router.post('/site/get', function(req, res, next) {
    req.body = JSON.parse(req.body);
    
    var devicesn = req.body["device-sn"];
    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];

    if(devicesn && devicesn.length > 0) { 

        // Get device data
        getdevicebysn(devicesn)
            .then(function (devicedata) {
                var deviceuuid = devicedata["UUID"];
                var devicename = devicedata["NAME"];
                var projectuuid = devicedata["PROJECTUUID"];

                // Get project data
                getprojectbyuuid(projectuuid)
                    .then(function (projectdata) {
                        var projectname = projectdata["NAME"];
                        var projectid = projectdata["ID"];
                        
                        var file_name = path.data("gatorbyte", projectid, devicename, "site.json");
                        var siteconfigdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

                        res.send({ "status": "success", "payload": siteconfigdata, "meta": {
                            "projectid": projectid,
                            "devicename": devicename,
                            "path": file_name
                        }});
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "site.json");
        var siteconfigdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

        res.send({ "status": "success", "payload": siteconfigdata, "meta": {
            "projectid": projectid,
            "devicename": devicename,
            "path": file_name
        }});
    }
});

// Update a site's dashboard configuration data
router.post('/site/update', function(req, res, next) {
    req.body = JSON.parse(req.body);
    
    var devicesn = req.body["device-sn"];
    var devicename = req.body["device-id"];
    var projectid = req.body["project-id"];

    if(devicesn && devicesn.length > 0) { 

        // Get device data
        getdevicebysn(devicesn)
            .then(function (devicedata) {
                var deviceuuid = devicedata["UUID"];
                var devicename = devicedata["NAME"];
                var projectuuid = devicedata["PROJECTUUID"];

                // Get project data
                getprojectbyuuid(projectuuid)
                    .then(function (projectdata) {
                        var projectname = projectdata["NAME"];
                        var projectid = projectdata["ID"];
                        
                        var file_name = path.data("gatorbyte", projectid, devicename, "site.json");
                        fs.writeFileSync(file_name, JSON.stringify(req.body["data"]), "utf8");

                        res.send({ "status": "success", "payload": siteconfigdata, "meta": {
                            "projectid": projectid,
                            "devicename": devicename,
                            "path": file_name
                        }});
                    });
            });
    }
    else if (devicename && projectid) {
        var file_name = path.data("gatorbyte", projectid, devicename, "site.json");
        var siteconfigdata = JSON.parse(fs.readFileSync(file_name, 'utf8'));

        fs.writeFileSync(file_name, JSON.stringify(req.body["data"]), "utf8");

        res.send({ "status": "success", "payload": siteconfigdata, "meta": {
            "projectid": projectid,
            "devicename": devicename,
            "path": file_name
        }});
    }
});

// Update a site's dashboard configuration data
router.post('/site/update', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var device_type = "gatorbyte";
    var site = req.body["device-id"];

    var dir_path = "./data" + "/" + device_type;
    if(!site) return;

    try{
        fs.writeFileSync(dir_path + "/" + site + "/site.json", JSON.stringify(req.body["data"]), "utf8");
        res.send({"status": "success"});
    }
    catch(e) {
        console.log("site.json not found for " + site + " in " + dir_path);
        res.status(400).send({ "status": "error", "message": "Couldn't write JSON data to file." });
    };
});

// Create a blank site folder
router.post('/site/create', function(req, res, next) {

        var device_id = JSON.parse(req.body)["device-id"];
        var user_email = JSON.parse(req.body)["user-email"];
        var user_id = JSON.parse(req.body)["user-id"];
        var project_id = JSON.parse(req.body)["project-id"];

    console.log("Creating new device: " + site_id + " for " + user_email);

    // Create folders to the datastore
    var datastore = path.data("gatorbyte", project_id, site_id, "readings.json");
    var datastore = path.control("gatorbyte", project_id, site_id, "control.json");
    var datastore = path.site("gatorbyte", project_id, site_id, "site.json");

    // Add site to user's approved list of devices
    var sitesconfig = JSON.parse(fs.readFileSync(process.cwd() + "/config/roles.json", "utf-8"));
    if (sitesconfig) {
        sitesconfig.forEach(function (user) {
            var email = user["EMAIL"];
            var sites = user["SITES"];

            if (email == user_email) {
                sites.push({
                    "SITE-ID": site_id,
                    "SITE-TYPE": "gatorbit",
                    "ROLE": "owner"
                });

                fs.writeFileSync(process.cwd() + "/config/roles.json", JSON.stringify(sitesconfig), "utf-8");
            }
        });
        
    }
    else {
        res.status(500).send({"status": "error", "message": "Email doesn't exist in roles.json"});
        return;
    }

    // TODO: Add site to additional list of users

    res.send({"status": "success", "message": "Site successfully created."});
});

// Get state flags
router.get('/state/get', function(req, res, next) {
    var flag_type =  req.query.flag_type;
    var device_id = req.query.device_id;
    var device_type = req.query.device_type;

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var file_name = "./data" + "/" + device_type + "/" + device_id + "/state.json";

    if(!fs.existsSync(file_name)) fs.writeFileSync(file_name, "{}", "utf8");
    var state_data = JSON.parse(fs.readFileSync(file_name, 'utf8'));

    // Send control flag
    res.send(flag_type ? state_data[flag_type] : state_data);
});

// Create a new record in the access database
router.post('/access/add', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var useruuid = req.body["user-uuid"];
    var projectuuid = req.body["project-uuid"];
    var deviceuuid = req.body["device-uuid"];
    var userrole = req.body["role"];
    var timestamp = req.body["timestamp"];

    // Check if email associated with an existing account
    db.run({
        db: db.instance.sites(req), 
        cmd: "SELECT * FROM DEVICE_ACCESS WHERE USERUUID=? AND DEVICEUUID=?", 
        values: [useruuid, deviceuuid],
        type: "json",
    })
        .then(function(results) {
            
            if (results.length == 0) {
                
                // User uuid
                var rowuuid = uuid();

                // Read db
                db.run({
                    db: db.instance.sites(req), 
                    cmd: "INSERT INTO DEVICE_ACCESS VALUES(?,?,?,?)", 
                    values: [rowuuid, useruuid, deviceuuid, userrole],
                    type: "json",
                })
                    .then(function(data) {
                        res.status(200).json({"status": "success", "message": "Access entry created successfully.", "payload": {
                            "uuid": rowuuid
                        }, "code": 1});
                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({"status": "Error creating device access entry.", "object": err, "code": 1});
                    });
            }

            // Update access
            else {

                db.run({
                    db: db.instance.sites(req), 
                    cmd: "UPDATE DEVICE_ACCESS SET ROLE=? WHERE USERUUID=? AND DEVICEUUID=?", 
                    values: [userrole, useruuid, deviceuuid],
                    type: "json",
                })
                    .then(function(results) {
                        res.status(200).json({ "status": "success", "message": "Device access updated for " + deviceuuid, "code": 1 });
                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({ "status": "Couldn't update devoce access.", "code": 2, "object": err });
                    });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Couldn't manipulate database.", "object": err, "code": 1});
        });
});

// Create a new record in the access database
router.post('/access/delete/all', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var useruuid = req.body["user-uuid"];
    var timestamp = req.body["timestamp"];

    // Check if email associated with an existing account
    db.run({
        db: db.instance.sites(req), 
        cmd: "DELETE FROM DEVICE_ACCESS WHERE USERUUID=?", 
        values: [useruuid],
        type: "json",
    })
        .then(function(results) {
            
            res.status(200).json({"status": "success", "message": "Access entry deleted.", "code": 1});
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Couldn't manipulate database.", "object": err, "code": 1});
        });
});

module.exports = router;