var express = require('express');
var router = express.Router();
var fs = require('fs');
var io = require('../io');
var onConnection = require('../socket-io/on-connection');


io.on('connection', onConnection);


/* GET home page. */
router.get('/', function(req, res, next) {
    //console.log(req.cookies);

    //res.writeHead(200);
    //res.send(req.cookies);
    //res.end();

    res.format({
      html: function() {
        res.render('index', { user: req.user });
      },
      json: function() {
        res.json({user: req.user});
      }
    });

});

module.exports = router;
