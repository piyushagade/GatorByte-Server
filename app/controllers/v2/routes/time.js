var express = require('express');
var router = express.Router();

 
//* Changed router.get to router.use nad add /time in front of the end-point
router.use('/:type', function(req, res, next) {
    var d = (new Date()).toString().split(" ");
    var response;

    // console.log(req.headers);

    switch(req.params.type){
        case "day": {
            response = d[0];
            break;
        }
        case "mon": {
            response = d[1];
            break;
        }
        case "year": {
            response = d[3];
            break;
        }
        case "date": {
            response = d[2];
            break;
        }
        case "hour": {
            var time = d[4];
            response = time.split(":")[0];
            break;
        }
        case "min": {
            var time = d[4];
            response = time.split(":")[1];
            break;
        }
        case "timezone": {
            response = d[5];
            break;
        }
        case "utc": {
            var response = { "seconds" : (parseInt(Date.now() / 1000)).toString(), "milliseconds" : Date.now().toString() };
            response = JSON.stringify(response);
            break;
        }
        case "ms": {
            var response = Date.now().toString();
            break;
        }
        case "seconds": {
            var response = (parseInt(Date.now() / 1000)).toString();
            break;
        }
    }

    res.send(response);
});

module.exports = router;