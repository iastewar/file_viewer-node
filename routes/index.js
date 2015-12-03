var express = require('express');
var router = express.Router();
var fs = require('fs');
var io = require('../io');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { user: req.user });
});

router.post('/', function(req, res) {
  // console.log(Object.keys(req.body)[0]);

  fs.writeFile("tmp/test.txt", Object.keys(req.body)[0], function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("The file was saved!");
  });

  io.emit('file received', Object.keys(req.body)[0]);

  res.writeHead(200);
  res.end();

})

module.exports = router;
