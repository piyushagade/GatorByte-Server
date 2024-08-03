var express = require('express');
var router = express.Router();
const fs = require('fs');
var device_type = "gatorbyte";
const db = require("./db.js");

// Create a project
router.post('/project/create', function(req, res, next) {

    var userid = JSON.parse(req.body.trim())["user-id"];
    var useremail = JSON.parse(req.body.trim())["user-email"].trim();
    var projectname = JSON.parse(req.body.trim())["project-name"].trim();
    var projectid = JSON.parse(req.body.trim())["project-id"].trim()
    var piname = JSON.parse(req.body.trim())["pi-name"].trim();

    var roles_file_path = "./config/roles.json";
    var projects_file_path = "./config/projects.json";

    // Verify user's permissions
    db.exec({
        db: db.instance.users(req),
        cmd: "SELECT * FROM ALL_USERS WHERE UUID=? AND EMAIL=?",
        values: [userid, useremail],
        success: function (user) {
            console.log(user);
            if (user.length == 0 ) { res.status(500).json({ "status": "error", "message": "User not found.", "code": 2 }); return; }
            if (user[0]["ROLE"] != "super") { res.status(500).json({ "status": "error", "message": "User is not authorized.", "code": 3 }); return; }
            
            // Get the first row
            user = user[0];

            // Insert into projects table
            db.exec({
                db: db.instance.projects(req),
                cmd: "INSERT INTO ALL_PROJECTS VALUES(?,?,?,?,?)",
                values: [uuid(), projectname, projectid, piname, "active"],
                success: function (data) {
                    res.send({ "status": "success", "payload": "projects" });
                },
                error: function (err) {
                    console.log(err); res.status(500).json({ "status": "error", "message": "Error reading DB", "code": 1 });
                    return;
                }
            });
        },
        error: function (err) {
            console.log(err); res.status(500).json({ "status": "error", "message": "Error reading DB", "code": 1 });
            return;
        }
    });
});

// Get all projects approved to a user
router.post('/get/all', function(req, res, next) {

    var email = JSON.parse(req.body.trim())["email"];
    var userid = JSON.parse(req.body.trim())["user-id"];

    // var roles_file_path = "./config/roles.json";
    // var projects_file_path = "./config/projects.json";
    // fs.readFile(roles_file_path, function (err, users) {
    //     if (err) { 
    //         res.status(500).send( { "status": "error", "message": 'Unable to read project\'s config file.' }); 
    //         return console.log('Unable to read project\'s config file: ' + err); 
    //     } 

    //     users = JSON.parse(users);

    //     var notfound = true;
    //     users.forEach(function(user, ui) {
    //         if (email != user["EMAIL"]) return; 

    //         notfound = false;

    //         var projectids = user["PROJECTS"];

    //         var allprojectdata = JSON.parse(fs.readFileSync(projects_file_path));
    //         var projects = {};
    //         projectids.forEach(function(projectid) {
    //             projects[projectid] = allprojectdata[projectid];
    //         });
    //         res.send({ "status": "success", "payload": projects });
    //     });

    //     if (notfound) res.send({ "status": "success", "payload": email });
    // });

    // Get the list of projects
    db.exec({
        db: db.instance.projects(req),
        cmd: "SELECT * FROM ALL_PROJECTS",
        values: [],
        success: function (projects) {
            db.exec({
                    db: db.instance.projects(req),
                    cmd: "SELECT * FROM PROJECT_ACCESS WHERE USERUUID=?",
                    values: [userid],
                    success: function (accessdata) {
                        res.send({ "status": "success", "payload": {
                            "projects": projects,
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

// Get all projects approved to a user
router.post('/get/project', function(req, res, next) {

    var projectid = req.body["project-id"];

    var file_path = "./config/projects.json";
    fs.readFile(file_path, function (err, projects) {
        if (err) { 
            res.status(500).send( { "status": "error", "message": 'Unable to read project\'s config file.' }); 
            return console.log('Unable to read project\'s config file: ' + err); 
        } 

        projects = JSON.parse(projects);
        res.send({ "status": "success", "payload": projects[projectid] });
    });
});

// Get a site's data
router.post('/sites/get/all', function(req, res, next) {
    var device_type = req.query.device_type;

    var file_path = "./config/projects.json";
    fs.readFile(file_path, function (err, projects) {

        var siteslist = JSON.parse(projects)["SITES"];

        if (err) { 
            res.status(500).send( { "status": "error", "message": 'Unable to read sites for the project.' }); 
            return console.log('Unable to read project\'s config file: ' + err); 
        } 
        res.send(siteslist);
    });
});

// Create a new record in the access database
router.post('/access/add', function(req, res, next) {
    req.body = JSON.parse(req.body);

    var useruuid = req.body["user-uuid"];
    var projectuuid = req.body["project-uuid"];
    var userrole = req.body["role"];
    var timestamp = req.body["timestamp"];

    // Check if email associated with an existing account
    db.run({
        db: db.instance.projects(req), 
        cmd: "SELECT * FROM PROJECT_ACCESS WHERE USERUUID=? AND PROJECTUUID=?", 
        values: [useruuid, projectuuid],
        type: "json",
    })
        .then(function(results) {
            
            // Add access
            if (results.length == 0) {
                
                // User uuid
                var rowuuid = uuid();

                // Read db
                db.run({
                    db: db.instance.projects(req),
                    cmd: "INSERT INTO PROJECT_ACCESS VALUES(?,?,?,?,?)", 
                    values: [rowuuid, projectuuid, useruuid, userrole, timestamp],
                    type: "json",
                })
                    .then(function(data) {
                        res.status(200).json({"status": "success", "message": "Access entry created successfully.", "payload": {
                            "uuid": rowuuid
                        }, "code": 1});
                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({"status": "Error creating project access entry.", "code": 1});
                    });
            }

            // Update access
            else {
                db.run({
                    db: db.instance.projects(req), 
                    cmd: "UPDATE PROJECT_ACCESS SET ROLE=? WHERE USERUUID=? AND PROJECTUUID=?", 
                    values: [userrole, useruuid, projectuuid],
                    type: "json",
                })
                    .then(function(results) {
                        res.status(200).json({ "status": "success", "message": "Project access updated for " + projectuuid, "code": 1 });
                    })
                    .catch(function(err) {
                        console.log(err);
                        res.status(500).json({ "status": "Couldn't update project access.", "code": 2, "object": err });
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
        db: db.instance.projects(req), 
        cmd: "DELETE FROM PROJECT_ACCESS WHERE USERUUID=?", 
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