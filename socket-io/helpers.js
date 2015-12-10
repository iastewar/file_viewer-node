var fs = require('fs');
var io = require('../io');

var helpers = {};

helpers.rmdirRec = function(directoryName, subDirectories, callback) {
	fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {

		var index = 0;
		fileNames.forEach(function(fileName) {
			fs.stat(directoryName + '/' + subDirectories + '/' + fileName, function(err, stats) {
				if (err || !stats) {
					console.log("trying to remove: " + directoryName + '/' + subDirectories + '/' + fileName);
					fs.rmdir(directoryName + '/' + subDirectories + '/' + fileName, function(err) {
						console.log(err);
					});
				} else {
					var subDirs;
					if (subDirectories === "") {
						subDirs = fileName;
					} else {
						subDirs = subDirectories + '/' + fileName;
					}

					if (stats.isDirectory()) {
						helpers.rmdirRec(directoryName, subDirs, function() {
							index++;
							if (index === fileNames.length) {
								fs.rmdir(directoryName + '/' + subDirectories, function(err) {
									if (err)
										console.log(err);
									if (callback)
										callback();
								});
							}
						});
					} else {
						fs.unlink(directoryName + '/' + subDirectories + '/' + fileName, function(err) {
							if (err) {
								console.log(err);
							}
							index++;
	            if (index === fileNames.length) {
	              fs.rmdir(directoryName + '/' + subDirectories, function(err) {
									if (err)
										console.log(err);
									if (callback)
										callback();
								});
	            }
						});
					}
				}

			});
		});
	});
}

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

helpers.sendDirectory = function(directoryName, subDirectories, room, callback) {
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
              if (callback) {
                callback(true);
              }
            }
          } else if (stats.isDirectory()) {
            helpers.sendDirectory(directoryName, subDirs, room, function() {
							index++;
	            if (index === fileNames.length) {
	              if (callback) {
	                callback(false);
	              }
	            }
						});

          } else {
            fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
              // send to client
              helpers.sendFileToClient(directoryName, subDirs, data, room);
              index++;
              if (index === fileNames.length) {
                if (callback) {
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
  //var room = 'individual room';
  //socket.join(room);
  //console.log("socket joined room " + room);
  var directoryName = "tmp/" + currentDir;
  // send directory to client
  helpers.sendDirectory(directoryName, "", socket.id, function(err) {
    //socket.leave(room);
    //console.log("socket left room " + room);

    if (callback) {
      if (err) {
        callback(true);
      } else {
        callback(false);
      }
    }
  });
}

helpers.isAuthenticated = function(socket) {
	if (!socket.request.user.logged_in) {
		io.to(socket.id).emit('log in');
		return false;
	} else {
		return true;
	}
}

module.exports = helpers;
