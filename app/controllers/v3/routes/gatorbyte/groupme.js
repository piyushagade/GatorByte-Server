var express = require('express');
var router = express.Router();
const https = require('https');
var config = require(process.cwd() + "/config/groupme.json");

router.post = function (message, bot_id) {


    var postData = JSON.stringify({ "text" : message, "bot_id" : config.BOTID });

    var options = {
    hostname: config.HOST,
    port: 443,
    path: config.PATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
        }
    };

    var req = https.request(options, (res) => {

        if (res.statusCode != 200) {
            console.log("Couldn't send a message to the GroupMe group.");
        }
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });

    req.write(postData);
    req.end();
}

module.exports = router;