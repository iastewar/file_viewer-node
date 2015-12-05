var express = require('express');
var router = express.Router();
var fs = require('fs');
var io = require('../io');
//var multer = require('multer');

//var upload = multer()

io.on('connection', function (socket) {
  socket.on('file received', function(msg){
    // get directory of file to be saved
    var dirFileArray = msg.fileName.split("/");
    var directory = "tmp";
    for (var i = 0; i < dirFileArray.length - 1; i++) {
      directory = directory + '/' + dirFileArray[i];
    }

    // try to create the directory
    fs.mkdir(directory, function(err) {
      // if file should be deleted, delete it
      if (msg.deleted) {
        fs.unlink("tmp/" + msg.fileName, function(err) {
          if (err) {
            return console.log(err);
          }
        })
      // otherwise, svae the file and send it to all listening sockets
      } else {
        fs.writeFile("tmp/" + msg.fileName, msg.fileContents, function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });

        io.emit('file received', msg.fileContents);
      }
    });
  });
});


/* GET home page. */
router.get('/', function(req, res, next) {
  // fs.readFile('tmp/test.txt', "utf-8", function (err, data) {
  //   if (err) throw err;
    res.render('index', { user: req.user });
  // });
});

module.exports = router;
