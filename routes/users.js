var express = require('express');
var router = express.Router();
var mongoose = require('mongoose'); //mongo connection
var bodyParser = require('body-parser') ;//parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var passport = require('passport');
var flash = require('connect-flash');
var session = require('express-session');

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

router.get('/login', function(req, res) {
  res.status("unauthenticated");
  res.format({
    html: function() {
      res.render('users/login.ejs', { message: req.flash('loginMessage'), user: req.user});
    },
    json: function() {
      res.json({user: req.user});
    }
  });
});

router.get('/signup', function(req, res) {
  res.render('users/signup.ejs', { message: req.flash('signupMessage'), user: req.user});
});

router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/users/signup',
  failureFlash: true
}));

router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/',
  failureRedirect: '/users/login',
  failureFlash: true
}));

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/:id/:dir', function(req, res) {
  res.render('users/show_dir.ejs', {user: req.user, dirUser: req.params.id, dir: req.params.dir});
});

// route middleware to make sure user is logged in
var isLoggedIn = function(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}

module.exports = router;
