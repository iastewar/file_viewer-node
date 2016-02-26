var fs = require('fs');
var io = require('../io');
var mongoose = require('mongoose');
var clientVersion = require('../config/client-version')

var helpers = {};

var updateCallback = function(err, numAffected) {
}

// converts an ArrayBuffer to a Buffer
helpers.toBuffer = function(ab) {
		if (!ab) return "";
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

helpers.rmdirRec = function(directoryName, subDirectories, userid, userDirName, callback) {
	fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
		if (err) {
			if (callback)
				callback();
		} else {
			if (fileNames.length === 0) {
				if (callback)
					callback();
			}
			var index = 0;
			fileNames.forEach(function(fileName) {
				var subDirs;
				if (subDirectories === "") {
					subDirs = fileName;
				} else {
					subDirs = subDirectories + '/' + fileName;
				}

				fs.stat(directoryName + '/' + subDirs, function(err, stats) {
					if (err || !stats) {
						fs.rmdir(directoryName + '/' + subDirs, function(err) {
						});
					} else {
						if (stats.isDirectory()) {
							helpers.rmdirRec(directoryName, subDirs, userid, userDirName, function() {
								index++;
								if (index === fileNames.length) {
									fs.rmdir(directoryName + '/' + subDirectories, function(err) {
										if (callback)
											callback();
									});
								}
							});
							fs.rmdir(directoryName + '/' + subDirs, function(err) {
							});
						} else {
							fs.unlink(directoryName + '/' + subDirs, function(err) {
								index++;
								mongoose.model('User').update({_id: userid}, {$inc: {totalNumberOfFiles: -1, totalDirectorySize: -stats.size}}, null, updateCallback);
								if (userDirName) {
									mongoose.model('User').update({_id: userid, "directories.name": userDirName}, {$inc: {"directories.$.numberOfFiles": -1, "directories.$.directorySize": -stats.size}}, null, updateCallback)
								}
		            if (index === fileNames.length) {
		              fs.rmdir(directoryName + '/' + subDirectories, function(err) {
										if (callback)
											callback();
									});
		            }
							});
						}
					}
				});
			});
		}
	});
}

// sends a file to the clients in a room where directoryName/fileName is the path of the file,
// and data is the content of the file
helpers.sendFileToClient = function(directoryName, fileName, data, room) {
  var dirArray = directoryName.split("/");
	var owner = dirArray[1];
  var currentDir = dirArray[dirArray.length-1];
  io.to(room).emit('send file', JSON.stringify({owner: owner, fileName: currentDir + '/' + fileName, fileContents: data}));
  console.log(room + ", " + currentDir + '/' + fileName);
}

// deletes a file from the clients in a room where directoryName/fileName is the path of the file
helpers.deleteFileFromClient = function(directoryName, fileName, room) {
  var dirArray = directoryName.split("/");
	var owner = dirArray[1];
  var currentDir = dirArray[dirArray.length - 1];
  io.to(room).emit('send file', JSON.stringify({owner: owner, fileName: currentDir + '/' + fileName, deleted: true}));
}

helpers.sendDirectory = function(directoryName, subDirectories, room, depthIsOne, callback) {
	// if we are not in a recursive call, check if directory exists and send appropriate message to room
	if (depthIsOne) {
		var arr = directoryName.split("/");
		if (arr.length >= 3) {
			mongoose.model('User').findOne({username: arr[1]}, {directories: {$elemMatch: {name: arr[2]}}}, function(err, user) {
				if (err || !user) {
					console.log("error: user " + arr[1] + " does not exist with directory " + arr[2]);
					io.to(room).emit('send directory error', arr[1] + "/" + arr[2]);
				} else {
					var msg = {};
					msg.name = arr[1] + "/" + arr[2];
					if (user.directories[0]) {
						msg.numberOfFiles = user.directories[0].numberOfFiles;
						msg.directorySize = user.directories[0].directorySize;
						io.to(room).emit('send folder', msg);
					} else {
						io.to(room).emit('send directory error', msg.name);
					}
				}
			});
		}
	}

  fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
    if (err) {
      // either the directory doesn't exist or we can't open this many files at once
      if (callback) callback(true);
    } else {
			if (fileNames.length === 0) {
        if (callback) callback (false);
        return;
      }

      var index = 0;

			var incIndex = function() {
        index++;
        if (index === fileNames.length) {
          if (callback) callback(false);
        }
      }

      // fileName could be a file or a directory
      fileNames.forEach(function(fileName) {
        fs.stat(directoryName + '/' + subDirectories + '/' + fileName, function(err, stats) {
          var subDirs;
          if (subDirectories === "") {
            subDirs = fileName;
          } else {
            subDirs = subDirectories + '/' + fileName;
          }

          if (stats.isDirectory()) {
            helpers.sendDirectory(directoryName, subDirs, room, false, function(err) {
							incIndex();
						});
          } else if (stats.isFile()) {
            fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
              helpers.sendFileToClient(directoryName, subDirs, data, room);
              incIndex();
            });
          } else {
						incIndex(); // just to be safe
					}
        });
      });
    }
  });
}

helpers.sendDirectoryToSingleClient = function(socket, currentDir, callback) {
  var directoryName = "tmp/" + currentDir;

  helpers.sendDirectory(directoryName, "", socket.id, true, function(err) {
    if (callback) {
      if (err) {
        callback(true);
      } else {
        callback(false);
      }
    }
  });
}

helpers.sendUserDirectories = function(room, username, callback) {
	mongoose.model('User').findOne({username: username}, function(err, user) {
		if (!err && user) {
			var directoriesLength = user.directories.length;
			if (directoriesLength === 0) {
				io.to(room).emit('user folder empty', username);
			}
			for (var i = 0; i < directoriesLength; i++) {
				io.to(room).emit('user folder', {owner: username, name: user.directories[i].name});
			}
		} else {
			io.to(room).emit('user folder empty', username);
		}
		callback();
	});

}

helpers.sendUserDirectoryEmpty = function(username) {
	io.to(username).emit('user folder empty', username);
}

helpers.sendUserDirectory = function(username, directoryName) {
	io.to(username).emit('user folder', {owner: username, name: directoryName});
}

helpers.sendDeleteUserDirectory = function(username, directoryName) {
	io.to(username).emit('delete user folder', {owner: username, name: directoryName});
}

helpers.sendMaxFileLimit = function(maxFilesAllowed, room) {
	io.to(room).emit('max files allowed', maxFilesAllowed);
}

helpers.sendMaxDirectorySizeLimit = function(maxDirectorySizeAllowed, room) {
	io.to(room).emit('max directory size allowed', maxDirectorySizeAllowed);
}

helpers.sendDirectorySentSuccessfully = function(room, directoryName) {
	io.to(room).emit('folder sent successfully', directoryName);
}

helpers.isAuthenticated = function(socket) {
	if (!socket.request.user.logged_in) {
		io.to(socket.id).emit('log in');
		return false;
	} else {
		return true;
	}
}

// check if user is logged in and send their username. Also send a message telling
// the client to resend all directories (if any) since they will have been deleted
helpers.sendInitialMessages = function(socket) {
	if (helpers.isAuthenticated(socket)) {
		io.to(socket.id).emit('is logged in', socket.request.user.username);
		io.to(socket.id).emit('resend folders');
		helpers.sendUserStats(socket);
	} else {
		io.to(socket.id).emit('log in');
	}
	io.to(socket.id).emit('client version', clientVersion);
}

helpers.sendUserStats = function(socket) {
	mongoose.model('User').findOne({_id: socket.request.user._id}, function(err, user) {
		if (!err && user) {
			io.to(socket.id).emit('user stats', {totalNumberOfFiles: user.totalNumberOfFiles, totalDirectorySize: user.totalDirectorySize});
		}
	});
}

helpers.sendDirectoryStats = function(socket, directoryName) {
	mongoose.model('User').findOne({_id: socket.request.user._id}, {directories: {$elemMatch: {name: directoryName}}}, function(err, user) {
		if (!err && user && user.directories[0]) {
			io.to(socket.id).emit('directory stats', {directoryName: directoryName, numberOfFiles: user.directories[0].numberOfFiles, directorySize: user.directories[0].directorySize})
		}
	});
}

helpers.sendSentFolder = function(room, name) {
	io.to(room).emit('sent folder', name);
}

module.exports = helpers;
