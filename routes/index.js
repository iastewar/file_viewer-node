var express = require('express');
var router = express.Router();
var fs = require('fs');
var io = require('../io');
//var multer = require('multer');

//var upload = multer()




// removes a directory asynchronously
var rmdirAsync = function(path, callback) {
	fs.readdir(path, function(err, files) {
		if(err) {
			// Pass the error on to callback
			callback(err, []);
			return;
		}
		var wait = files.length,
			count = 0,
			folderDone = function(err) {
			count++;
			// If we cleaned out all the files, continue
			if( count >= wait || err) {
				fs.rmdir(path,callback);
			}
		};
		// Empty directory to bail early
		if(!wait) {
			folderDone();
			return;
		}

		// Remove one or more trailing slash to keep from doubling up
		path = path.replace(/\/+$/,"");
		files.forEach(function(file) {
			var curPath = path + "/" + file;
			fs.lstat(curPath, function(err, stats) {
				if( err ) {
					callback(err, []);
					return;
				}
				if( stats.isDirectory() ) {
					rmdirAsync(curPath, folderDone);
				} else {
					fs.unlink(curPath, folderDone);
				}
			});
		});
	});
};

// sends a file to the clients in a room where directoryName/fileName is the path of the file,
// and data is the content of the file
var sendFileToClient = function(directoryName, fileName, data, room) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1];
  io.to(room).emit('send file', {fileName: currentDir + '/' + fileName, fileContents: data});
  console.log(room + ", " + currentDir + '/' + fileName);
}

// deletes a file from the clients in a room where directoryName/fileName is the path of the file
var deleteFileFromClient = function(directoryName, fileName, room) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length - 1];
  io.to(room).emit('send file', {fileName: currentDir + '/' + fileName, deleted: true});
}

var depth = 0;
var sendDirectory = function(directoryName, subDirectories, room, callback) {
  depth++;
  fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
    if (err) {
      io.to(room).emit('folder does not exist');
      if (callback) {
        callback(true);
      }
    } else {
      var index = 0;
      // fileName could be a file or a directory
      fileNames.forEach(function(fileName){
        fs.stat(directoryName + '/' + subDirectories + '/' + fileName, function(err, stats) {
          var subDirs;
          if (subDirectories === "") {
            subDirs = fileName;
          } else {
            subDirs = subDirectories + '/' + fileName;
          }
          if (stats.isFile() && stats.size > 16777216) {
            console.log("Error, " + fileName + " is over 16MB and can't be sent");
            index++;
            if (index === fileNames.length) {
              depth--;
              if (depth === 0 && callback) {
                callback(true);
              }
            }
          } else if (stats.isDirectory()) {
            sendDirectory(directoryName, subDirs, room, callback);
            index++;
            if (index === fileNames.length) {
              depth--;
              if (depth === 0 && callback) {
                callback(false);
              }
            }
          } else {
            fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
              // send to client
              sendFileToClient(directoryName, subDirs, data, room);
              index++;
              if (index === fileNames.length) {
                depth--;
                if (depth === 0 && callback) {
                  callback(false);
                }
              }
            });
          }

        });
      });

    }
  });
}

var sendDirectoryToSingleClient = function(socket, currentDir, callback) {
  // join a solo room
  var room = 'individual room';
  socket.join(room);
  console.log("socket joined room " + room);
  var directoryName = "tmp/" + currentDir;
  // send directory to client
  sendDirectory(directoryName, "", room, function(err) {
    socket.leave(room);
    console.log("socket left room " + room);

    if (callback) {
      if (err) {
        callback(true);
      } else {
        callback(false);
      }
    }
  });
}

io.on('connection', function(socket) {
  socket.on('connect folder', function(msg) {
    sendDirectoryToSingleClient(socket, msg, function(err) {
      if (!err) {
        socket.join(msg);
        console.log("socket joined room " + msg);
      }
    });
  });

  socket.on('disconnect folder', function(msg) {
    socket.leave(msg);
    console.log("socket left room " + msg);
  });

  socket.on('send file', function(msg) {
    // get directory of file to be saved
    var dirFileArray = msg.fileName.split("/");
    var room = dirFileArray[0];
    var directory = "tmp";
    for (var i = 0; i < dirFileArray.length - 1; i++) {
      directory = directory + '/' + dirFileArray[i];
    }

    // try to create the directory
    fs.mkdir(directory, function(err) {
      // if file should be deleted, delete it
      if (msg.deleted) {
        fs.stat("tmp/" + msg.fileName, function(err, stats) {
          if (!stats) {
            return;
          }
          if (stats.isFile()) {
            fs.unlink("tmp/" + msg.fileName, function(err) {
              if (err) {
                return console.log(err);
              }
            });
          } else {
            rmdirAsync("tmp/" + msg.fileName);
          }
        });
        // delete file from all listening sockets
        var fileNameToSend = ""
        for (var i = 1; i < dirFileArray.length - 1; i++) {
          fileNameToSend = fileNameToSend + dirFileArray[i] + '/';
        }
        fileNameToSend += dirFileArray[dirFileArray.length - 1];
        deleteFileFromClient(room, fileNameToSend, room);

      // otherwise, save the file and send it to all listening sockets
      } else {
        fs.writeFile("tmp/" + msg.fileName, msg.fileContents, function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });

        // send file to all listening sockets
        var fileNameToSend = ""
        for (var i = 1; i < dirFileArray.length - 1; i++) {
          fileNameToSend = fileNameToSend + dirFileArray[i] + '/';
        }
        fileNameToSend += dirFileArray[dirFileArray.length - 1];
        sendFileToClient(room, fileNameToSend, msg.fileContents, room);
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
