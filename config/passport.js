var LocalStrategy = require('passport-local').Strategy;
//var User = require('../model/users');
var mongoose = require('mongoose'); // can get at the model using mongoose or the user file itself

var pass = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    mongoose.model('User').findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use('local-signup', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  }, function(req, username, password, done) {

    // User.find won't fire unless data is sent back
    process.nextTick(function() {


      mongoose.model('User').findOne({ 'username': username }, function(err, user) {
        if (err)
          return done(err);

        if (user) {
          return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
        } else {
          mongoose.model('User').create({
            username: username,
            password: password
          }, function(err, user) {
            if (err) {
              return done(null, false, req.flash('signupMessage', 'A field is blank.'));
            } else {
              user.password = user.generateHash(password);
              user.save(function(err) {
                   if (err)
                       console.log(err);
                   return done(null, user);
               });
            }
          });
        }
      });
    });
  }));

  passport.use('local-login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  }, function(req, username, password, done) {
    mongoose.model('User').findOne({ 'username': username }, function(err, user) {
      if (err)
        return done(err);
      if (!user)
        return done(null, false, req.flash('loginMessage', 'Invalid Username!'));
      if (!user.validPassword(password))
        return done(null, false, req.flash('loginMessage', 'Invalid password!'));

      return done(null, user);
    });
  }));

}


module.exports = pass;
