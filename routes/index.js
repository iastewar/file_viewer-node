var express = require('express');
var router = express.Router();
var fs = require('fs');
var io = require('../io');


/* GET home page. */
router.get('/', function(req, res, next) {
  fs.readFile('tmp/test.txt', "utf-8", function (err, data) {
    if (err) throw err;
    res.render('index', { user: req.user, data: data});
  });
});

router.post('/', function(req, res) {
  //console.log(req);

  var file = "";
  var bodyKeys = Object.keys(req.body);
  for (var i = 0; i < bodyKeys.length; i++) {
    file = file + bodyKeys[i] + req.body[bodyKeys[i]];
  }

  fs.writeFile("tmp/test.txt", file, function(err) {
      if(err) {
          return console.log(err);
      }

      console.log("The file was saved!");
  });

  io.emit('file received', file);

  res.writeHead(200);
  res.end();

})

module.exports = router;
