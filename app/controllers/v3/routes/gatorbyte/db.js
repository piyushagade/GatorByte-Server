var fs = require('fs');
const readline = require('readline');
const multiline = require('multiline');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function dbconnect(path, callback) {
    let db = new sqlite3.Database(path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => { 
        if(err) console.log(err);
        if (callback && typeof callback === "function") callback();
    });
    db.configure('busyTimeout', 5000);
    return db;
}

var DB_DIR = path.join(process.cwd(), "db");
console.log(DB_DIR);

module.exports = {
    obj: sqlite3,

    instance: {
        projects: function() { return dbconnect(path.join(DB_DIR, "projects.db")); },
        sites: function() { return dbconnect(path.join(DB_DIR, "sites.db")); },
        users: function() { return dbconnect(path.join(DB_DIR, "users.db")); }
    },
    instancebypath: (pathtodatabase) => { 
        if (fs.existsSync(pathtodatabase)) return dbconnect(pathtodatabase);
        else return;
    },
    exec: function(args) {
        try {
            var db = args.db, cmd = args.cmd, values = args.values || [], success = args.success, error = args.error, type = args.type;
            db.all(cmd, values, (err, rows) => {

                if (err) {if(error && typeof error == "function") error(err)}
                else if(success && typeof success == "function") {
                    
                    // Unescape quotes
                    var json_rows = rows;
                    var csv_rows = j2c(rows);

                    // Unescape quotes
                    json_rows = c2j(unescape_quotes(csv_rows.trim()));
                    csv_rows = unescape_quotes(csv_rows.trim());

                    success((rows && type && type.toLowerCase() == "csv" ? csv_rows : json_rows));
                }
            });
        }
        catch(err) {
            console.log("Error in 'exec' function in db.js");
            console.log(err);
        }
    },

    run: function(args) {
        var db = args.db, cmd = args.cmd, values = args.values || [], success = args.success, error = args.error, type = args.type, log = args.log;
        if(log) console.log(log);
        
        return new Promise(function(resolve, reject) {

            db.all(cmd, values, (err, rows) => {

                // Close db connection
                db.close();
                
                // Handle errors
                if (err) { 
                    if (err.message.indexOf("no such table:") > -1) {
                        console.error("Table not found: " + err.message.split("no such table:")[1].trim());
                    }
                    else {
                        console.log("Database error: " + err.message);
                    }
                    reject(err); return;
                }

                // Construct response object
                var results;
                
                // CSV response
                if (rows && type && type.toLowerCase() == "csv") {
                    results = j2c(rows);
                    results = unescape_quotes(results.trim());
                }

                // JSON response
                else {
                    results = rows;
                    results = c2j(unescape_quotes(j2c(results).trim()));
                }

                resolve(results);
            });

        });
    },

    log: function (args) {
        if(!args.req || !args.id || !args.email || !args.semester || !args.year || !args.timestamp || !args.type || !args.description) {
            console.log("Couldn't log admin activity. Some fields are undefined.");
            return;
        }
        var db = dbconnect(data_directory(args.req) + '/db/admin.db');
        var cmd = "INSERT INTO ALL_ADMIN_ACTIVITY VALUES(?,?,?,?,?,?,?)";
        var values = [args.id, args.email, args.semester, args.year, args.timestamp, args.type, args.description.substring(0, 100)];

        db.all(cmd, values, (err, rows) => {
            db.close();
            if (err) {
                console.log(err); return;
            }
        });
    },

    createtable: function (args) {
        if (!args.tablename) return;
        if (!args.columns || typeof args.columns !== "object" || args.columns.length == 0) return;

        var command = multiline(function () {/*
            CREATE TABLE IF NOT EXISTS "{{tablename}}" (
                {{columns}}
            );
        */}, {
            "tablename": tablename,
            "columns": columns
        })

        db.all(command, function (err, res) {
            return res;
        });

    },

    tableexists: function (args) {
        if (!args.tablename) return false;

        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='" + args.tablename + "';", function (err, tables) {
            return tables.length > 0;
        });

    },

    tables: function(db) {
        db.all("select name from sqlite_master where type='table'", function (err, tables) {
            return tables;
        });
    },

}