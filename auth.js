const passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const flash = require('connect-flash');
const app = require("./app");

app.use(passport.initialize());
app.use(passport.session());

app.get('/success', (req, res) => res.send("Welcome "+req.query.username+"!!"));
app.get('/error', (req, res) => res.send("error logging in"));

passport.use(new LocalStrategy(
    function(username, password, done) {
        var user_exists = true;
        var password_valid = username == "admin" & password == "lalala";

        if (!user_exists) return done(null, false);
        else if (!password_valid) return done(null, false);
        return done(null, user);
    }
));

app.post('/',
    passport.authenticate('local', { failureRedirect: '/error' }),
    function(req, res) {
        res.redirect('/success?username='+req.user.username);
    }
);