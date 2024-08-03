const { exec } = require("child_process");
const https = require('https');
var HOST = "ezbean-lab.com"

setInterval(() => {
    exec("forever list", (error, stdout, stderr) => {
        if (error) console.log(error);
        if (stderr) console.log(stderr);
        stdout = stdout.replace(/\\[a-z]+[0-9]+[A-Z]+[[0-9;]*m/, "").replace("\s+", ",").replace("data:", "").replace("info:", "").replace(/\[[0-9]+\]/, "")
        
        var rows = stdout.split('\n');
        var csv;
        rows.forEach(function (row, ri) {
            if (row.length == 0) return;
            row = row.replace(/\s+/g, ",").replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").replace(/\[[0-9]+\]/g, '').replace(/data:/g, '').replace(/info:/g, '').split(",").filter((v) => { return v.length > 0 }).join(",");
            if (ri == 1) csv = row;
            else if (ri > 1) csv += '\n' + row;
        });

        var processes = c2j(csv);
        processes.forEach((process) => {
            process["host"] = HOST;
            process["timestamp"] = new Date().getTime();
        });

        post(processes);
    });
}, 120 * 1000);

var c2j = function (csv) {
    function CSVToArray(csvData, delimiter) {
        delimiter = (delimiter || ",");
         var pattern = new RegExp((
        "(\\" + delimiter + "|\\r?\\n|\\r|^)" +
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        "([^\"\\" + delimiter + "\\r\\n]*))"), "gi");
        var data = [[]];
        var matches = null;
        while (matches = pattern.exec(csvData)) {
            var matchedDelimiter = matches[1];
            if (matchedDelimiter.length && (matchedDelimiter != delimiter)) {
                data.push([]);
            }
            if (matches[2]) {
                var matchedDelimiter = matches[2].replace(
                new RegExp("\"\"", "g"), "\"");
            } else {
                var matchedDelimiter = matches[3];
            }
            data[data.length - 1].push(matchedDelimiter);
        }
        return (data);
    }

    var data = CSVToArray(csv);
    var objData = [];
    for (var i = 1; i < data.length; i++) {
        objData[i - 1] = {};
        for (var k = 0; k < data[0].length && k < data[i].length; k++) {
            var key = data[0][k];
            objData[i - 1][key] = data[i][k]
        }
    }
    var jsonData = JSON.stringify(objData);
    jsonData = jsonData.replace(/},/g, "},\r\n");
    return JSON.parse(jsonData);
}

var post = function (data) {
    data = JSON.stringify(data);
    
    const options = {
        hostname: 'api.piyushagade.xyz',
        port: 443,
        path: '/v1/servers/processes/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }

    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)

        // res.on('data', d => {
        //     process.stdout.write(d)
        // })
    });

    req.on('error', error => {
        console.error(error)
    });

    req.write(data);
    req.end();
}