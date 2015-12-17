var express = require('express');
var router = express.Router();
var mongoose = require('mongoose'); //mongo connection
var bodyParser = require('body-parser') ;//parses information from POST
var methodOverride = require('method-override'); //used to manipulate POST
var passport = require('passport');
var flash = require('connect-flash');
var session = require('express-session');
var io = require('../io');
var onConnection = require('../socket-io/on-connection');
var fs = require('fs');


io.on('connection', onConnection);

/* GET home page. */
router.get('/', function(req, res, next) {
    res.format({
      html: function() {
        res.render('index', { user: req.user });
      },
      json: function() {
        res.json({user: req.user});
      }
    });

});

router.get('/download', function(req, res) {
  var file =  __dirname + '/downloads/CodeMirror-darwin-x64/CodeMirror.zip'
  res.download(file, 'CodeMirror.zip');
});

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
  res.format({
    html: function() {
      res.render('users/signup.ejs', { message: req.flash('signupMessage'), user: req.user});
    },
    json: function() {
      res.json({user: req.user});
    }
  });
});

router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signup',
  failureFlash: true
}));

router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/:id', function(req, res) {
  fs.readdir("tmp/" + req.params.id, function(err, folderNames) {
    if (err) {
      res.render("users/show_all_dir.ejs", { user: req.user, owner: req.params.id, folderNames: null });
    } else {
      res.render("users/show_all_dir.ejs", { user: req.user, owner: req.params.id, folderNames: folderNames });
    }
  });
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
