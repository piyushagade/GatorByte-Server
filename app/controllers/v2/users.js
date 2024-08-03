var express = require('express');
var router = express.Router();
const f = require("./functions.js")();
const db = require("./db.js");
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

// Get list of sites for the admin
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


module.exports = router;