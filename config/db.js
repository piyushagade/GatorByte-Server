var mysql = require('mysql');
var connection = mysql.createConnection({
    host: "testdbinstance.ccznj1hcwwoa.us-west-2.rds.amazonaws.com",
    user: "piyushagade",
    password: "hakunamatata",
    multipleStatements: true
});

connection.connect(function(err) {
    if (err) {
        console.log("Can't connect to the database: " + err.code);
    }
    else{
        console.log("Connected to database");
    }
    console.log("------------------------------------------\n");
});

module.exports.db = connection;