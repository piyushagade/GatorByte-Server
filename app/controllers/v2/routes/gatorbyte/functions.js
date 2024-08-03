const fs = require('fs');
var Papa = require('papaparse');

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
        results = Papa.parse(csv, {
            header: true
        }).data;
        return return_as_string ? JSON.stringify(results) : results;
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
        "data": function (type, id, datastore, defaultdata) {
            if(!type || !id || !datastore) console.log("Cannot get path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + id + "/" + datastore, JSON.stringify(defaultdata || []), "utf8");
            
            return "./data" + "/" + type + "/" + id + "/" + datastore;
        },
        "control": function (type, id, datastore, defaultdata) {
            if(!type || !id || !datastore) console.log("Cannot get path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + id + "/" + datastore, JSON.stringify(defaultdata || {}), "utf8");
            
            return "./data" + "/" + type + "/" + id + "/" + datastore;
        },
        "calibration": function (type, id, datastore, defaultdata) {
            if(!type || !id || !datastore) console.log("Cannot get path. Please provide all required arguments.");

            // If the device type does not have a data folder yet 
            if (!fs.existsSync("./data" + "/" + type)) fs.mkdirSync("./data" + "/" + type);
            
            // If the device does not have a data folder yet (viz. this is the device's first time reporting to server)
            if (!fs.existsSync("./data" + "/" + type + "/" + id)) fs.mkdirSync("./data" + "/" + type + "/" + id);
            
            // If the datastore file doesn't exist (viz. This is the first time device is sending any data) 
            if (!fs.existsSync("./data" + "/" + type + "/" + id + "/" + datastore)) fs.writeFileSync("./data" + "/" + type + "/" + id + "/" + datastore, JSON.stringify(defaultdata || {}), "utf8");
            
            return "./data" + "/" + type + "/" + id + "/" + datastore;
        },
    }

    this.append = {
        "json": function (datastore, datum) {
            if(!datum || !datastore) console.log("Cannot get path. Please provide all required arguments.");

            var datum = typeof datum == "string" ? JSON.parse(datum) : datum;

            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));
            
            // If datum is a JSON array
            if(Array.isArray(datum))
                datum.forEach(row => {
                    data.push(row);
                });
            else if (typeof datum == "object") 
                data.push(datum);

            // Update the datastore
            fs.writeFileSync(datastore, JSON.stringify(data), function (err) { if (err) { console.log(err); return false; } });
        }
    }

    this.set = {
        "json": function (datastore, key, value) {
            if(!key || !value || !datastore) console.log("Cannot get path. Please provide all required arguments.");

            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));
            
            // Add/update the key
            data[key] = value;

            // Update the datastore
            fs.writeFileSync(datastore, JSON.stringify(data), function (err) { if (err) { console.log(err); return false; } });
        }
    }

    this.get = {
        "json": function (datastore, key) {
            if(!key || !datastore) console.log("Cannot get path. Please provide all required arguments.");

            // Read JSON datastore
            var data = JSON.parse(fs.readFileSync(datastore, "utf8"));
            
            return data[key];
        }
    }

}