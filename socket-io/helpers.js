var fs = require('fs');
var io = require('../io');

var helpers = {};

// removes a directory asynchronously
helpers.rmdirAsync = function(path, callback) {
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
helpers.sendFileToClient = function(directoryName, fileName, data, room) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1];
  io.to(room).emit('send file', {fileName: currentDir + '/' + fileName, fileContents: data});
  console.log(room + ", " + currentDir + '/' + fileName);
}

// deletes a file from the clients in a room where directoryName/fileName is the path of the file
helpers.deleteFileFromClient = function(directoryName, fileName, room) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length - 1];
  io.to(room).emit('send file', {fileName: currentDir + '/' + fileName, deleted: true});
}

var depth = 0;
helpers.sendDirectory = function(directoryName, subDirectories, room, callback) {
  depth++;
  fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
    if (err) {
      // either the directory doesn't exist or we can't open this many files at once
      io.to(room).emit('send directory error');
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

helpers.sendDirectoryToSingleClient = function(socket, currentDir, callback) {
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

module.exports = helpers;
