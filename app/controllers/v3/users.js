var express = require('express');
var router = express.Router();
const f = require("./functions.js")();
const db = require("./routes/gatorbyte/db.js");
const fs = require("fs");
const path = require("path");
const { Base64 } = require('js-base64');
const { exec } = require("child_process");
const moment = require("moment");
const sp = require('synchronized-promise')

// Verify admin information for login
router.post('/verify', function(req, res, next) {
    req.body = JSON.parse(req.body);

    if(!req.body["email"] || req.body["email"].length == 0) {
        res.status(400).json({"status": "Please enter a valid email.", "code": 1});
        return;
    }

    if(!req.body["password"] || req.body["password"].length == 0) {
        res.status(400).json({"status": "Please enter a password.", "code": 1});
        return;
    }

    var email = req.body["email"];
    var password = Base64.encode(req.body["password"]);

    // Read db
    db.run({
        db: db.instance.users(req), 
        cmd: "SELECT * FROM ALL_USERS WHERE EMAIL=? AND PASSWORD=?", 
        values: [email, password],
        type: "json",
    })
        .then(function(data) {
            if (data.length == 0) res.status(401).json({"status": "error", "message": "Authentication failed", "code": 1});
            else {
                delete data[0]["PASSWORD"];
                res.status(200).json({"status": "success", "message": "User verified", "payload": data[0], "code": 1});
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Error reading DB", "code": 1});
        });
});

// Get list of sites for the admin/user
router.post('/sites/get', function(req, res, next) {

    authorize(req)
        .then(function (user) {
            var roles = JSON.parse(fs.readFileSync(dir.config() + "/roles.json", "utf-8"));
            var data = grep(roles, "EMAIL", user.EMAIL, true);

            res.status(200).json({ "status": "success", "code": 0, "payload": data.SITES });
        })
        .catch(function (e) {
            console.log(e);
            res.status(401).json({ "status": "failed", "code": 1, "message": "User not found" });
        });
});

// Get admin information
router.get('/admin/get', function(req, res, next) {

    var member_email = req.query.email;

    // Read db
    db.run({
        db: db.instance.admin(req), 
        cmd: "SELECT NAME,EMAIL,POSITION,ROLE,ID,YEAR FROM ALL_ADMINS WHERE EMAIL=?", 
        values: [member_email],
        type: "csv"
    })
        .then(function(data) {
            console.log(data);
            res.type("text").send(data);
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Error reading DB", "code": 1});
        });
});

// Create a new user account
router.post('/user/add', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var name = req.body["name"];
    var email = req.body["email"];
    var password = req.body["password"];

    if(!name || name.length == 0) {
        res.status(400).json({"status": "Please provide a valid name.", "code": 1});
        return;
    }

    if(!email || email.length == 0) {
        res.status(400).json({"status": "Please enter a valid email.", "code": 1});
        return;
    }

    if(!password || password.length == 0) {
        res.status(400).json({"status": "Please enter a password.", "code": 1});
        return;
    }

    // Convert password to b64
    password = Base64.encode(req.body["password"]);

    // Check if email associated with an existing account
    db.run({
        db: db.instance.users(req), 
        cmd: "SELECT * FROM ALL_USERS WHERE EMAIL=?", 
        values: [email],
        type: "json",
    })
        .then(function(results) {
            
            if (results.length == 0) {
                
                // User uuid
                var useruuid = uuid();

                // Read db
                db.run({
                    db: db.instance.users(req), 
                    cmd: "INSERT INTO ALL_USERS VALUES(?,?,?,?,?,?)", 
                    values: [useruuid, name, email, password, "", ""],
                    type: "json",
                })
                    .then(function(data) {
                        res.status(200).json({"status": "success", "message": "User created successfully.", "payload": {
                            "uuid": useruuid
                        }, "code": 1});
                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({"status": "Error creating user.", "code": 1});
                    });
            }

            else {
                res.status(200).json({"status": "success", "message": "Email associated with an existing account.", "payload": {
                    "uuid": results[0].UUID
                }, "code": 1});
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({"status": "Couldn't create user.", "code": 1});
        });
});

// Update a user account
router.post('/user/update', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var useruuid = req.body["user-uuid"];
    var name = req.body["name"];
    var email = req.body["email"];
    var password = req.body["password"];

    if(!name || name.length == 0) {
        res.status(400).json({"status": "Please provide a valid name.", "code": 1});
        return;
    }

    if(!email || email.length == 0) {
        res.status(400).json({"status": "Please enter a valid email.", "code": 1});
        return;
    }

    // Convert password to b64
    if (password) password = Base64.encode(req.body["password"]);

    // Check if email associated with an existing account
    db.run({
        db: db.instance.users(req), 
        cmd: "SELECT * FROM ALL_USERS WHERE UUID=?", 
        values: [useruuid],
        type: "json",
    })
        .then(function(results) {

            if (results.length != 0) {

                // Update record
                db.run({
                    db: db.instance.users(req), 
                    cmd: !password ? "UPDATE ALL_USERS SET NAME=?, EMAIL=? WHERE UUID=?" : "UPDATE ALL_USERS SET NAME=?, EMAIL=?, PASSWORD=? WHERE UUID=?", 
                    values: !password ? [name, email, useruuid] : [name, email, password, useruuid],
                    type: "json",
                })
                    .then(function(results) {
                        res.status(200).json({ "status": "success", "message": "User information updated.", "code": 1, "payload": {
                            "uuid": useruuid
                        } });
                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({ "status": "Couldn't update user.", "code": 2, "object": err });
                    });
            }
            else {
                res.status(400).json({ "status": "error", "message": "User does not exist for UUID: " + useruuid, "code": 3 });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({ "status": "Couldn't update user.", "code": 4, "object": err });
        });
});

// Get all users in a project
router.post('/get/users/byproject/', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var projectuuid = req.body["project-uuid"];

    if(!projectuuid || projectuuid.length == 0) {
        res.status(400).json({"status": "Please provide the project UUID.", "code": 1});
        return;
    }

    // Get all user UUID that have access to the provided project 
    db.run({
        db: db.instance.projects(req), 
        cmd: "SELECT * FROM PROJECT_ACCESS WHERE PROJECTUUID=?", 
        values: [projectuuid],
        type: "json",
    })
        .then(function(accessdata) {
            
            if (accessdata.length == 0) {
                res.status(200).json({ "status": "success", "message": "No users found for project UUID: " + projectuuid, "code": 1 });
            }

            else {

                // For each row in access data 'accessdata', get the user's name, email, etc
                db.run({
                    db: db.instance.users(req), 
                    cmd: "SELECT * FROM ALL_USERS", 
                    type: "json",
                })
                    .then(function(usersdata) {
                        
                        var results = [];
                        accessdata.forEach((accessrow, ari) => {
                            var useruuid = accessrow["USERUUID"];
                            var userdata = usersdata.filter(function (d) { return d["UUID"] == useruuid })[0];
                            delete userdata["PASSWORD"];

                            results.push({
                                ...userdata,
                                "ROLE": accessrow["ROLE"]
                            });

                            if (ari == accessdata.length - 1) res.status(200).json({ "status": "success", "message": "No users", "payload": results });
                        });

                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({ "status": "Couldn't get users.", "code": 1, "object": err });
                    });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({ "status": "Couldn't get users.", "code": 1, "object": err });
        });
});

// Get all projects accessible to a user
router.post('/get/projects/byuser/', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var useruuid = req.body["user-uuid"];

    if(!useruuid || useruuid.length == 0) {
        res.status(400).json({"status": "Please provide the user UUID.", "code": 1});
        return;
    }

    // Get all project UUID that the user has access to. 
    db.run({
        db: db.instance.projects(req), 
        cmd: "SELECT * FROM PROJECT_ACCESS WHERE USERUUID=?", 
        values: [useruuid],
        type: "json",
    })
        .then(function(accessdata) {
            
            if (accessdata.length == 0) {
                res.status(200).json({ "status": "success", "message": "No projects found for user UUID: " + useruuid, "code": 1 });
            }

            else {
                res.status(200).json({ "status": "success", "payload": accessdata });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({ "status": "Couldn't get users.", "code": 1, "object": err });
        });
});

// Get all devices accessible to a user
router.post('/get/devices/byuser/', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var useruuid = req.body["user-uuid"];

    if(!useruuid || useruuid.length == 0) {
        res.status(400).json({"status": "Please provide the user UUID.", "code": 1});
        return;
    }

    // Get all project UUID that the user has access to. 
    db.run({
        db: db.instance.sites(req), 
        cmd: "SELECT * FROM DEVICE_ACCESS WHERE USERUUID=?", 
        values: [useruuid],
        type: "json",
    })
        .then(function(accessdata) {
            
            if (accessdata.length == 0) {
                res.status(200).json({ "status": "success", "message": "No users found for user UUID: " + useruuid, "code": 1 });
            }

            else {
                res.status(200).json({ "status": "success", "payload": accessdata });
            }
        })
        .catch(function(err) {
            console.log(err);
            res.status(500).json({ "status": "Couldn't get devices from the devices.", "code": 1, "object": err });
        });
});

module.exports = router;