var express = require('express');
var router = express.Router();
const fs = require('fs');
var socket, io;
var device_type = "gatorbyte";

// Execute command
router.post('/command/execute', function(req, res, next) {
    if(typeof req.body == "string") req.body = JSON.parse(req.body);

    var device_id = req.body.device_id.trim();
    var command = req.body.command.trim().toLowerCase();

    if(!device_id){ console.log("Device id not sent. Please add \"device\" key to the data.");return; }
    var control_file_name = "./data" + "/" + device_type + "/" + device_id + "/control.json";
    if(!fs.existsSync(control_file_name)) {res.status(400).send({"status": "failed", "message": "Control file doesn't exist."}); return;}

    if (command.indexOf("set") == 0) {
        command = command.replace("set ", "").trim();

        if(command.split("=").length == 2) {
            var key = command.split("=")[0].trim();
            var value = command.split("=")[1].trim();

            var control_file_data = JSON.parse(fs.readFileSync(control_file_name, "utf8"));

            if (Object.keys(control_file_data).indexOf(key) == -1) { res.status(400).send({"status": "failed", "message": "Invalid command."}); return;}
            control_file_data[key] = value == 1 ? value : 0;
            fs.writeFileSync(control_file_name, JSON.stringify(control_file_data), "utf8");

            // Send data
            res.send({"status": "success"});
        }
        else { res.status(400).send({"status": "failed", "message": "Invalid sentence"}); return; }
    }

    else if (command.indexOf("server") == 0) {
        command = command.replace("server ", "").trim();

        if(command == "restart") {
            require("child_process").exec("forever restartall", (error, stdout, stderr) => {
                if (error) {
                    res.send({"status": "failed", "message": error.message});
                    return;
                }
                if (stderr) {
                    res.send({"status": "failed"});
                    return;
                }

                // Send data
                res.send({"status": "success"});
            });

        }
        else { res.status(400).send({"status": "failed", "message": "Invalid sentence"}); return; }
    }
    else { res.status(400).send({"status": "failed", "message": "Invalid sentence"}); return; }
});

module.exports = router;