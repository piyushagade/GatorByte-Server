const fs = require('fs');
const path = require('path');
var Papa = require('papaparse');
const db = require("./db.js");
const { spawn } = require('child_process');

module.exports = function () {

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
        try {
            results = Papa.parse(csv, {
                header: true
            }).data;
            return return_as_string ? JSON.stringify(results) : results;
        }
        catch (e) {
            return csv;
        }
    }

    this.escape_quotes = function(string) {
        return string.replace(/"/g, '\\"').replace(/'/g, '\\\'');
    }

    this.unescape_quotes = function(string) {
        return string.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\'\'/g, "'");
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

    this.path = {
        "data": function (type, projectid, id, datastore, defaultdata) {
            if(!type || !projectid || !id || !datastore) console.log("Cannot get 'data' path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);

            // If the project does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid)) fs.mkdirSync("./data" + "/" + type + "/" + projectid);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + projectid + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type  + "/" + projectid + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore, JSON.stringify(defaultdata || []), "utf8");
            
            return "./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore;
        },
        "log": function (type, projectid, id, datastore, defaultdata) {
            if(!type || !projectid || !id || !datastore) console.log("Cannot get 'log' path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the project does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid)) fs.mkdirSync("./data" + "/" + type + "/" + projectid);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + projectid + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore, JSON.stringify(defaultdata || []), "utf8");
            
            return "./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore;
        },
        "control": function (type, projectid, id, datastore, defaultdata) {
            if(!type || !projectid || !id || !datastore) console.log("Cannot get 'control' path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the project does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid)) fs.mkdirSync("./data" + "/" + type + "/" + projectid);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + projectid + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore, JSON.stringify(defaultdata || {}), "utf8");
            
            return "./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore;
        },
        "state": function (type, projectid, id, datastore, defaultdata) {
            if(!type || !projectid || !id || !datastore) console.log("Cannot get 'state' path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the project does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid)) fs.mkdirSync("./data" + "/" + type + "/" + projectid);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + projectid + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore, JSON.stringify(defaultdata || {}), "utf8");
            
            return "./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore;
        },
        "calibration": function (type, projectid, id, datastore, defaultdata) {
            if(!type || !projectid || !id || !datastore) console.log("Cannot get 'calibration' path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the project does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid)) fs.mkdirSync("./data" + "/" + type + "/" + projectid);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + projectid + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore, JSON.stringify(defaultdata || {}), "utf8");
            
            return "./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore;
        },
        "site": function (type, projectid, id, datastore, defaultdata) {
            if(!type || !projectid || !id || !datastore) console.log("Cannot get 'site' data path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the project does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid)) fs.mkdirSync("./data" + "/" + type + "/" + projectid);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + projectid + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore, JSON.stringify(defaultdata || {}), "utf8");
            
            return "./data" + "/" + type + "/" + projectid + "/" + id + "/" + datastore;
        },
    }

    this.append = {
        "json": function (datastore, datum) {
            if(!datum || !datastore) console.log("Append failed. Cannot get 'json - append' data path. Please provide all required arguments.");

            var datum = typeof datum == "string" ? JSON.parse(datum) : datum;

            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));
            
            // If datum is a JSON array
            if(Array.isArray(datum))
                datum.forEach(row => {
                    data.push(row);
                });
            else if (typeof datum == "object") data.push(datum);

            // Update the datastore
            fs.writeFileSync(datastore, JSON.stringify(data), function (err) { if (err) { console.log(err); return false; } });
        }
    }

    this.set = {
        "json": function (datastore, key, value) {

            if(!key || value == undefined || !datastore) console.log("Cannot get 'json - set' data path. Please provide all required arguments.");

            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));

            // Add/update the key
            data[key] = value;

            // Update the datastore
            fs.writeFileSync(datastore, JSON.stringify(data), function (err) { if (err) { console.log(err); return false; } });
        }
    }

    this.unset = {
        "json": function (datastore, key) {
            if(!key || !datastore) console.log("Cannot get 'json - unset' data path. Please provide all required arguments.");

            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));

            // Unset/update the key
            delete data[key];

            // Update the datastore
            fs.writeFileSync(datastore, JSON.stringify(data), function (err) { if (err) { console.log(err); return false; } });
        }
    }

    this.get = {
        "json": function (datastore, key) {
            if(!key || !datastore) console.log("Cannot get 'json - get' data path. Please provide all required arguments.");
            
            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));

            return data[key] != undefined ? data[key] : "null";
        }
    }

    this.getdevicebysn = function (serialnumber) {

        return new Promise(function (resolve, reject) {
            if(!serialnumber) { console.log("Please provide serialnumber in the arguments."); reject(); }

            // Find device by SN
            db.exec({
                db: db.instance.sites(),
                cmd: "SELECT * FROM ALL_DEVICES WHERE SN=?",
                values: [serialnumber],
                success: function (device) {
                    if (device.length == 0) {
                        console.log("No devices found for the serial number: " + serialnumber);
                        reject();
                    }
                    else {
                        device = device[0];
                        resolve(device);
                    }
                },
                error: function (err) {
                    reject(err);
                }
            });
        })
    }

    this.getdevicebyuuid = function (uuid) {

        return new Promise(function (resolve, reject) {
            if(!uuid) { console.log("Please provide device UUID in the arguments."); reject(); }

            // Find device by SN
            db.exec({
                db: db.instance.sites(),
                cmd: "SELECT * FROM ALL_DEVICES WHERE UUID=?",
                values: [uuid],
                success: function (device) {
                    if (device.length == 0) {
                        console.log("No devices found for the serial number: " + uuid);
                        reject();
                    }
                    else {
                        device = device[0];
                        resolve(device);
                    }
                },
                error: function (err) {
                    reject(err);
                }
            });
        })
    }
    
    this.getprojectbyuuid = function (uuid) {

        return new Promise(function (resolve, reject) {
            if(!uuid) { console.log("Please provide project UUID in the arguments."); reject(); }

            // Find device by SN
            db.exec({
                db: db.instance.projects(),
                cmd: "SELECT * FROM ALL_PROJECTS WHERE UUID=?",
                values: [uuid],
                success: function (project) {
                    if (project.length == 0) {
                        console.log("No project found for the UUID: " + uuid);
                        reject();
                    }
                    else {
                        project = project[0];
                        resolve(project);
                    }
                },
                error: function (err) {
                    reject(err);
                }
            });
        })
    }

    this.runexternalscript = function (identifier, datapath) {
        return new Promise((resolve, reject) => {
            if (!identifier) reject(`Please provide an identifier for the external script.`);

            if (identifier == "check-order") {
                runpythonscript(path.join("/home/pagade/scripts", "checkorder.py"), datapath)
                    .then(function (result) {
                        resolve(result);
                    })
                    .catch (function (err) {
                        reject(err)
                    });
            }

            else if (identifier == "force-order") {
                runpythonscript(path.join("/home/pagade/scripts", "forceorder.py"), datapath)
                    .then(function (result) {
                        resolve(result);
                    })
                    .catch (function (err) {
                        reject(err)
                    });
            }
        });
    }

    this.runpythonscript = function (scriptpath, arguments) {
        return new Promise((resolve, reject) => {
            let result = '';
            const scriptprocess = spawn('python', [scriptpath, arguments]);
            scriptprocess.stdout.on('data', (data) => {
              result += data.toString();
            });
            scriptprocess.stderr.on('data', (data) => {
              console.error(`Error: ${data}`);
            });
        
            scriptprocess.on('close', (code) => {
                if (code !== 0) {
                    reject(`Python script exited with code ${code}`);
                } else {
                    resolve(result.trim());
                }
            });
        });
    }

}