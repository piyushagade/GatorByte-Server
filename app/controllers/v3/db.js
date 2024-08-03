var fs = require('fs');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
// const f = require("./functions.js")();

function db_connect(path, callback) {
    let db = new sqlite3.Database(path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => { 
        if(err) console.log(err);
    });
    return db;
}

module.exports = {
    obj: sqlite3,

    instance: { 
        projects: function() { return dbconnect(path.join(DB_DIR, "projects.db")); },
        users: function(req) {return db_connect(dir.db() + '/users.db')},
        devices: function(req) {return db_connect(dir.db() + '/devices.db')},
    },

    exec: function(args) {
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
    },

    run: function(args) {
        var db = args.db, cmd = args.cmd, values = args.values || [], success = args.success, error = args.error, type = args.type, log = args.log;
        if(log) console.log(log);
        return new Promise(function(resolve, reject) {
            db.all(cmd, values, (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err); return;
                }
                // Unescape quotes
                var json_rows = rows;
                var csv_rows = j2c(rows);

                // Unescape quotes
                json_rows = c2j(unescape_quotes(csv_rows.trim()));
                csv_rows = unescape_quotes(csv_rows.trim());
                
                resolve((rows && type && type.toLowerCase() == "csv" ? csv_rows : json_rows));
            });
        });
        
    },

    log: function (args) {
        if(!args.req || !args.id || !args.email || !args.semester || !args.year || !args.timestamp || !args.type || !args.description) {
            console.log("Couldn't log admin activity. Some fields are undefined.");
            return;
        }
        var db = db_connect(data_directory(args.req) + '/db/admin.db');
        var cmd = "INSERT INTO ALL_ADMIN_ACTIVITY VALUES(?,?,?,?,?,?,?)";
        var values = [args.id, args.email, args.semester, args.year, args.timestamp, args.type, args.description.substring(0, 100)];

        db.all(cmd, values, (err, rows) => {
            db.close();
            if (err) {
                console.log(err); return;
            }
        });
    },

    tables: function(db) {
        db.all("select name from sqlite_master where type='table'", function (err, tables) {
            return tables;
        });
    },

    // init: function() {
    //     // Events
    //     db_exec(db_events, `
    //     CREATE TABLE IF NOT EXISTS ALL_EVENTS (
    //         TYPE TEXT NOT NULL,
    //         NAME TEXT NOT NULL UNIQUE,
    //         YEAR NUMBER NOT NULL,
    //         SEMESTER TEXT NOT NULL,
    //         CREATED_BY NUMBER NOT NULL,
    //         CREATED_AT NUMBER NOT NULL,
    //         VERIFICATION_CODE TEXT NOT NULL,
    //         URL TEXT NOT NULL,
    //         DESCRIPTION TEXT NOT NULL,
    //         FB_URL TEXT NOT NULL,
    //         TIME NUMBER NOT NULL,
    //         LOCATION TEXT NOT NULL,
    //         REG_START NUMBER NOT NULL,
    //         REG_END NUMBER NOT NULL
    //     );
    //     `);

    //     db_exec(db_events, `
    //     CREATE TABLE IF NOT EXISTS ALL_SIGN_INS (
    //         EMAIL TEXT NOT NULL,
    //         GUESTS NUMBER NOT NULL,
    //         EVENT_TYPE NUMBER NOT NULL,
    //         EVENT_NAME TEXT NOT NULL,
    //         YEAR NUMBER NOT NULL,
    //         SEMESTER NUMBER NOT NULL
    //     );
    //     `);

    //     // Announcements
    //     db_exec(db_announcements, `
    //     CREATE TABLE IF NOT EXISTS ALL_ANNOUCEMENTS (
    //         ANNOUNCEMENT TEXT NOT NULL,
    //         YEAR NUMBER NOT NULL,
    //         SEMESTER NUMBER NOT NULL,
    //         CREATED_BY TEXT NOT NULL,
    //         CREATED_AT NUMBER NOT NULL
    //     );
    //     `);

    //     // Blogs
    //     db_exec(db_blogs, `
    //     CREATE TABLE IF NOT EXISTS ALL_BLOGS (
    //         HEADING TEXT NOT NULL,
    //         YEAR NUMBER NOT NULL,
    //         SEMESTER NUMBER NOT NULL,
    //         CREATED_BY TEXT NOT NULL,
    //         CREATED_AT NUMBER NOT NULL,
    //         TEXT_PREVIEW TEXT NOT NULL,
    //         TEXT VARCHAR(32000) NOT NULL,
    //         CONTENT_TYPE TEXT NOT NULL
    //     );
    //     `);

    //     // Members status
    //     db_exec(db_members, `
    //     CREATE TABLE IF NOT EXISTS STATUS (
    //         NAME TEXT NOT NULL,
    //         EMAIL NUMBER NOT NULL,
    //         WAIVER TEXT NOT NULL,
    //         SOCIALS NUMBER NOT NULL,
    //         SERVICE NUMBER NOT NULL,
    //         SPECTATING NUMBER NOT NULL,
    //         FUNDRAISING NUMBER NOT NULL
    //     );
    //     `);

    //     // Sales
    //     db_exec(db_sales, `
    //     CREATE TABLE IF NOT EXISTS ALL_SALES (
    //         TYPE TEXT NOT NULL,
    //         NAME TEXT NOT NULL,
    //         YEAR NUMBER NOT NULL,
    //         SEMESTER NUMBER NOT NULL,
    //         CREATED_BY TEXT NOT NULL,
    //         CREATED_AT NUMBER NOT NULL,
    //         URL TEXT NOT NULL,
    //         DESCRIPTION TEXT NOT NULL,
    //         REG_START NUMBER NOT NULL,
    //         REG_END NUMBER NOT NULL,
    //         OPTIONS TEXT NOT NULL
    //     );
    //     `);

    //     db_exec(db_sales, `
    //     CREATE TABLE IF NOT EXISTS ALL_ORDERS (
    //         EVENT_NAME TEXT NOT NULL,
    //         NAME TEXT NOT NULL,
    //         EMAIL TEXT NOT NULL,
    //         IDENTIFIER TEXT NOT NULL,
    //         QUANTITY NUMBER NOT NULL,
    //         NOTES TEXT,
    //         ADDRESS TEXT,
    //         TIMESTAMP NUMBER NOT NULL
    //     );
    //     `);

    //     db_exec(db_sales, `
    //     CREATE TABLE IF NOT EXISTS ALL_PAYMENTS (
    //         EVENT_NAME TEXT NOT NULL,
    //         NAME TEXT NOT NULL,
    //         METHOD TEXT NOT NULL,
    //         RECEIVER TEXT NOT NULL,
    //         AMOUNT NUMBER NOT NULL,
    //         NOTES TEXT,
    //         TIMESTAMP NUMBER NOT NULL,
    //         ADDED_BY TEXT NOT NULL
    //     );
    //     `);

    //     db_exec(db_sales, `
    //     CREATE TABLE IF NOT EXISTS ALL_FULFILLMENTS (
    //         EVENT_NAME TEXT NOT NULL,
    //         NAME TEXT NOT NULL,
    //         METHOD TEXT NOT NULL,
    //         FULFILLED_BY TEXT NOT NULL,
    //         ITEMS NUMBER NOT NULL,
    //         NOTES TEXT,
    //         TIMESTAMP NUMBER NOT NULL,
    //         ADDED_BY TEXT NOT NULL
    //         );
    //         `);
    //     },
        
    //     // Disconnect db
    //     db_disconnect: function (db) {
    //         db.close();
    //     },
        
    //     db_exec: function (db, cmd) {
    //         db.run(cmd || "");
    //     },

    // db_drop: function (db, name) {
    //     db.run("DROP TABLE IF EXISTS " + name);
    // }
}