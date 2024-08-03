const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const compression = require('compression');
const favicon = require('express-favicon');
const helmet = require('helmet');
const morgan = require('morgan');
const chalk = require ('chalk');
const esub = require ('express-subdomain');
const app = express();

// HTTP to HTTPS redirection
//! Probably not needed
app.use (function (req, res, next) {
    if (req.protocol == "https" || (!req.headers["x-https-supported"] || req.headers["x-https-supported"] == "false")) next();
    else if (req.protocol == "http") res.redirect('https://' + req.headers.host + req.url);
});

// API security
app.use(helmet());

// Log HTTP(S) requests
if(false)
    app.use(
        morgan(function (tokens, req, res) {
            var is_data_source = req.headers["x-is-data-source"] == "true";

            // Log to file
            var file_name = "./log/" + (is_data_source ? "api" : "web") + ".csv";
            var file_str = "\n" + [req.protocol, req.method, req.headers["x-device-type"] || "N/A", tokens.url(req, res), tokens.status(req, res), tokens['response-time'](req, res), new Date().getTime()].join(",");
            try{ fs.appendFile(file_name, file_str, function (err) { if (err) { res.send("Error writing the data on the server."); throw err; } }); }
            catch(e){ }
            
            // Log to console
            var protocol = req.protocol == "https" ? chalk.green(req.protocol.toUpperCase() + " ") : chalk.red(req.protocol.toUpperCase() + " ");
            var method = req.method;
            var device_type = (is_data_source ? chalk.cyan("SOURCE") : "CONSUMER") + " " + chalk.yellow((req.headers["x-device-type"] || "N/A").toUpperCase());
            var device_id = chalk.yellow((req.headers["x-device-id"] || "N/A").toUpperCase());
            var url = tokens.url(req, res) + " ";
            var status = tokens.status(req, res) < 400 ? chalk.green(tokens.status(req, res)) : chalk.red(tokens.status(req, res));
            var response_time = " - " +  tokens['response-time'](req, res) + "ms" + " ";
            var timestamp = new Date().getTime(); 
            var time = chalk.grey(new Date(timestamp).toDateString() + ", " + new Date(timestamp).toTimeString().split(" GMT")[0]);

            var console_str = "(" + protocol + method + ") "
                + "(" + device_type + " - " + device_id + ") "
                + url 
                + "(" + status + ") "
                + response_time
                //+ "(" + time + ")";

            var publish_str = JSON.stringify({
                protocol: req.protocol,
                method: req.method,
                url: tokens.url(req, res),
                status: tokens.status(req, res),
                timestamp: timestamp
            });
            
            // Exclude preflight request from console logging
            if (req.method == "OPTIONS") return null;

            // console.publish("server", "server/morgan", publish_str);
            return console_str;
        })
    );

/* CORS */
app.use(function (req, res, next) {
    var allowed_origins = [
        'null',
        '*.piyushagade.xyz',
        '*.ezbean-lab.com',
        "localhost"
    ];

    var origin = req.headers.origin;

    for(var allowed_origin of allowed_origins) {
        if(origin && origin.replace("https://", "").replace("http://", "").indexOf(allowed_origin.replace(/\*./g, "")) > -1) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-device-type, x-last-data-point-timestamp, x-is-data-source, x-device-id');
    res.header('Access-Control-Allow-Credentials', true);

    return next();
});

/* Add other headers */
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    return next();
});

/* Cookie/body parsers */
// app.use(bodyParser.json({limit: '5mb'}));
// app.use(bodyParser.urlencoded({limit: '5mb', extended: false}));
// app.use(bodyParser.raw({limit: '5mb'}));

app.use(bodyParser.text({type: '*/*'}));
app.use(bodyParser.json({ limit: '20mb' })); 
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));
app.use(bodyParser.raw({ limit: '20mb' }));

/* Compression */
app.use(compression());

/* Routes */
app.use(esub('api', require('./app/controllers/api')));
app.use(esub('apis', require('./app/controllers/api')));
app.use(esub('sapi', require('./app/controllers/api')));

/* Catch 404 */
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/* Show error page */
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.end();
    
    // if (req.accepts('html')) res.sendFile(path.join(__dirname, "/www/assets/pages/error/" + (err.status || 500) + ".html"));
    // else if (req.accepts('json')) res.send({ "error": 'Not found' });
    // else res.type('txt').send('Not found');

    // Show 500 errors
    if(!err.status) console.log(err);
});

module.exports = {
    app: app
}