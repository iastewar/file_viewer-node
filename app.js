var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var flash = require('connect-flash');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passportSocketIo = require("passport.socketio");
var io = require('./io');

// dbs
var db = require('./model/db');
var user = require('./model/users');

// route paths
var users = require('./routes/users');

var app = express();

require('./config/passport')(passport); // pass passport for configuration

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var sessionStore = new MongoStore({ mongooseConnection: db.connection });
app.use(session({
    key: 'file.view-sid-key',
    secret: 'iamasecretsecretforfileview',
    cookie: {maxAge: 604800000},
    rolling: true,
    store: sessionStore
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


// route urls
app.use('/', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,        // the same middleware you registrer in express
  key:          'file.view-sid-key',        // the name of the cookie where express/connect stores its session_id
  secret:       'iamasecretsecretforfileview',         // the session_secret to parse the cookie
  store:        sessionStore,           // we NEED to use a sessionstore. no memorystore please
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));

function onAuthorizeSuccess(data, accept){
  console.log('successsful connection to socket.io: user is logged in')
  accept();
}

function onAuthorizeFail(data, message, error, accept){
  console.log('successsful connection to socket.io: user is not logged in');
  accept();
}

module.exports = app;
