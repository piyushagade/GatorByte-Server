// Imports
const express = require('express');
const router = express.Router();
const fs = require('fs');
const f = require('./functions')();
const db = require('./db');

// API routes handling
router.use('/gatorbit', require('./routes/gatorbyte/route'));
router.use('/gatorbyte', require('./routes/gatorbyte/route'));
router.use('/gatorbyte-vt', require('./routes/gatorbyte/route'));
router.use('/time', require('./routes/time'));
router.use('/users', require('./users'));

// Exports
module.exports = router;