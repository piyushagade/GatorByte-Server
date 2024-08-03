// Imports
const express = require('express');
const router = express.Router();
const fs = require('fs');

// API version routes handling
var versions = ["v3"];

for(var version of versions) router.use('/' + version, require('./' + version + '/api'));

// Exports
module.exports = router;