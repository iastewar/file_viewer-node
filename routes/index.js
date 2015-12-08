var express = require('express');
var router = express.Router();
var fs = require('fs');
var io = require('../io');
var onConnection = require('../socket-io/on-connection');


io.on('connection', onConnection);


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { user: req.user });
});

module.exports = router;
