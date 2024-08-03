var fs = require('fs');
const readline = require('readline');
var Papa = require('papaparse');
const sqlite3 = require('sqlite3').verbose();
const {Base64} = require('js-base64');
const e = require('express');
const { exec } = require("child_process");
var btoa = require('btoa');
var atob = require('atob');

var SEMESTER, YEAR;

var dir = {
    db: function () {
        return process.cwd() + "/db";
    },
    config: function () {
        return process.cwd() + "/config";
    },
}

module.exports = function() { 
    
    // Get data directory path
    this.dir = dir;
    
    // Prune execution
    this.prune = function (res){
        return function(res) {
            res.json({status: "Execution pruned"});
            return;
        }();
    }

    this.execute = function (cmd, args) {
        return new Promise((resolve, reject) => {
            exec(cmd + (args ? " " + args : ""), { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
              if (error) {
                console.warn(error);
                reject(error);
              } 
              resolve(stdout, stderr, error);
            });
          });
    }

    // Grep JSON array by key
    this.grep = function (data, key, value, first_only) {
        var res = [];
        data.forEach(function (item) {
            if (item[key] == value) res.push(item);
        });
        return first_only ? res[0] : res;
    }

    // Convert JSON to CSV
    this.j2c = function (arrayOfJson) {
        if(arrayOfJson.length == 0) return "";
        const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
        const header = Object.keys(arrayOfJson[0])
        var csv = arrayOfJson.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
        csv.unshift(header.join(','))
        csv = csv.join('\r\n')
        return csv;
    }

    // Convert CSV to JSON
    this.c2j = function (csv, return_as_string){
        results = Papa.parse(csv, {
            header: true
        }).data;
        return return_as_string ? JSON.stringify(results) : results;
    }

    // Convert String to b64
    this.str2b64 = function (str){
        return Base64.encode(str);
    }

    // Convert b64 to String
    this.b642str = function (b64){
        return Base64.decode(b64);
    }

    // Validate b64 string/check if string is b64 encoded
    this.validate_b64 = function (str){
        try {
            return btoa(atob(str)) == str;
        } catch (err) {
            return false;
        }
    }

    this.config = {
        semester: function() {
            var month = parseInt(new Date().getMonth()) + 1;
            var semester;
            if(month >= 1 && month <=4) semester = "spring";
            else if(month >= 5 && month <=7) semester = "summer";
            else if(month >= 8 && month <=12) semester = "fall";
            SEMESTER = semester;
            return semester;
        },
        year: function() {
            var month = parseInt(new Date().getMonth()) + 1;
            var semester;
            if(month >= 1 && month <=4) semester = "spring";
            else if(month >= 5 && month <=7) semester = "summer";
            else if(month >= 8 && month <=12) semester = "fall";

            var year = parseInt((new Date().getFullYear()).toString().substr(2,4));
            if (semester == "spring") year--;
            YEAR = year;
            return year;
        }
    }

    this.log = function(obj) {
        return console.log(obj);
    }

    this.escape_quotes = function(string) {
        return string.replace(/"/g, '\\"').replace(/'/g, '\\\'');
    }

    this.unescape_quotes = function(string) {
        return string.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\'\'/g, "'");
    }

    // Authorize admins
    this.authorize = function (req, args) {
        let db = new sqlite3.Database(dir.db() +  '/users.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => { 
            if(err) {
                console.log(err);
                console.log("Can't open admins database: " + dir.db() +  '/users.db');
            }
        });

        if (typeof req.body == "string") req.body = JSON.parse(req.body);

        var email = req.body.email;
        var password = Base64.encode(req.body.password);

        var cmd = "SELECT * FROM ALL_USERS WHERE EMAIL=? AND PASSWORD=?";
        values = [email, password];
        return new Promise(function(resolve, reject) {
            db.all(cmd, values, (err, rows) => {
                if (err) {  reject(err); return; }
                if(rows.length > 0) resolve(rows[0]);
                else reject();
            });
        });
    }

    this.xlsx2csv = function(path) {
        const obj = xlsx.parse(path);
        var rows = [];
        var writeStr = "";

        //looping through all sheets
        for(var i = 0; i < obj.length; i++)
        {
            var sheet = obj[i];
            //loop through all rows in the sheet
            for(var j = 0; j < sheet['data'].length; j++)
                //add the row to the rows array
                rows.push(sheet['data'][j]);
        }

        //creates the csv string to write it to a file
        for(var i = 0; i < rows.length; i++) writeStr += rows[i].join(",") + "\n";
        return writeStr;
    }

    // TODO: Deprecate
    this.get_admin_email_from_access_code = function (req, access_code, ) {
        // var dev = req.query.dev == "true" ? true : false; var data_folder = dev ? "dev" : "live";
        // var org = req.query.org; if(!org || org == "") {res.status(401).json({"status": "Organization info not provided.", "code": 0});return;}
        
        // Check for access code
        var access_codes = JSON.parse(data_directory(req) + "/admin/admin_codes.json");
        var admin_email;
        access_codes.forEach(object => {
            if (object.code == access_code) {
                admin_email = object.email;
            }
        });
        return admin_email;
    }

    this.title_case = function (str) {
        // return str.trim().charAt(0).toUpperCase() + str.trim().substring(1);
        return str.toLowerCase().split(' ').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ');
    }
    
    // TODO: Deprecate
    this.get_instructor_email_from_access_code = function (access_code) {
        var dev = req.query.dev == "true" ? true : false; var data_folder = dev ? "dev" : "live";
        var org = req.query.org; if(!org || org == "") {res.status(401).json({"status": "Organization info not provided.", "code": 0});return;}
        
        var access_codes = JSON.parse(data_directory(req) + "/admin/instuctor_codes.json");
    
        // Check for access code
        var admin_email;
        access_codes.forEach(object => {
            if (object.code == access_code) {
                admin_email = object.email;
            }
        });
        return admin_email;
    }

    this.role_to_integer = function (role) {
        role = role.toLowerCase();
        return role == "super" ? 3 : 
            role == "admin" ? 2 : 
            role == "moderator" ? 1 : 
            role == "spectator" ? 0 : 
            -1;
    }

    // TODO: Deprecate
    this.create_ri = function (filename) {
        return readline.createInterface({
            input: fs.createReadStream(__dirname.replace("/modules", "") + filename),
            output: process.stdout,
            terminal: false
        });
    }

    // TODO: Deprecate
    this.check_in_file = function (filename, key, query) {
        var results = []
        return new Promise(function(resolve, reject) {
            // Read file
            const ri = create_ri(filename);
            var header;
            ri.on('line', function(line) {
                if(!header) {
                    header = line;
                    results.push(header);
                }
                else {
                    var index = header.split(",").indexOf(key);
    
                    if(query.toLowerCase() == line.split(",")[index].toLowerCase()) {
                        results.push(line);
                    }
                }
            });
            ri.on('close', function(line) {
                resolve(results);
            });
        });
    }

    // TODO: Deprecate???
    this.get_config = function (org, uuid) {
        var config_filename = "/config.json";
        return new Promise(function(resolve, reject) {
            fs.readFile(__dirname.replace("/modules", "") + config_filename, 'utf8', function(err, contents) {
                if (err) {
                    console.log(err);
                }
                else {
                    contents = JSON.parse(contents);
                    org_config = contents[org];
                    
                    resolve({
                        "semester": org_config.YEAR,
                        "YEAR": org_config.semester
                    });
                }
            });
        });
    }

    this.uuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }

    this.empty_or_null = function(value) {
        return !value || (value && value.trim().length == 0);
    }
}