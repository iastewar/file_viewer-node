var fs = require('fs');
var helpers = require('./helpers');
var mongoose = require('mongoose');

var maxFileSize = 20971520;                  // the total number of bytes allowed per file
var maxFilesAllowed = 10000;                 // the total number of files allowed per user
var maxDirectorySizeAllowed = 104857600;     // the total number of bytes allowed per user

var updateCallback = function(err, numAffected) {
}

var onConnection = function(socket) {
  socket.on('delete folder', function(msg) {
    if (socket.request.user.logged_in) {
      if (socket.directories && socket.directories[msg]) {
        helpers.sendDeleteUserDirectory(socket.request.user.username, msg);
        mongoose.model('User').update({_id: socket.request.user._id}, {$pull: {directories: {name: msg}}}, updateCallback);
        helpers.rmdirRec("tmp/" + socket.request.user.username + "/" + msg, "", socket.request.user._id, null, function() {
          fs.rmdir("tmp/" + socket.request.user.username, function(err) {
            if (!err) {
              helpers.sendUserDirectoryEmpty(socket.request.user.username);
            }
          });
        });
      }
    }
  })

  socket.on('disconnect', function() {
    if (socket.request.user.logged_in) {
      if (socket.directories) {
        for (var dir in socket.directories) {
          if (socket.directories.hasOwnProperty(dir)) {
            helpers.sendDeleteUserDirectory(socket.request.user.username, dir);
            mongoose.model('User').update({_id: socket.request.user._id}, {$pull: {directories: {name: dir}}}, updateCallback);
            helpers.rmdirRec("tmp/" + socket.request.user.username + "/" + dir, "", socket.request.user._id, null, function() {
              fs.rmdir("tmp/" + socket.request.user.username, function(err) {
                if (!err) {
                  helpers.sendUserDirectoryEmpty(socket.request.user.username);
                }
              });
            });
          }
        }
      }
    }
  });

  socket.on('connect folder', function(msg) {
    helpers.sendDirectoryToSingleClient(socket, msg, function(err) {
      if (!err) {
        socket.join(msg);
        console.log("socket joined room " + msg);
      } else {
        console.log("problem sending directory to client");
      }
    });
  });

  socket.on('disconnect folder', function(msg) {
    socket.leave(msg);
    console.log("socket left room " + msg);
  });

  socket.on('show user folders', function(msg) {
    helpers.sendUserDirectories(socket.id, msg, function() {
      socket.join(msg);
      console.log("socket joined room " + msg);
    });
  });

  socket.on('disconnect user folders', function(msg) {
    socket.leave(msg);
    console.log("socket left room " + msg);
  });

  // maybe split this up into send user folder and send file?
  socket.on('send file', function(msg) {
    if (!helpers.isAuthenticated(socket)) {
      return;
    }

    // get directory of file
    var dirFileArray = msg.fileName.split("/");
    var room = socket.request.user.username + "/" + dirFileArray[0];

    var deleteOrSaveFile = function() {
      // if file should be deleted, delete it
      if (msg.deleted) {
        fs.stat("tmp/" + socket.request.user.username + "/" + msg.fileName, function(err, stats) {
          if (!stats) {
            return;
          }
          if (stats.isFile()) {
            fs.unlink("tmp/" + socket.request.user.username + "/" + msg.fileName, function(err) {
              if (err) {
              } else {
                mongoose.model('User').update({_id: socket.request.user._id}, {$inc: {totalNumberOfFiles: -1, totalDirectorySize: -stats.size}}, updateCallback);
                mongoose.model('User').update({_id: socket.request.user._id, "directories.name": dirFileArray[0]}, {$inc: {"directories.$.numberOfFiles": -1}}, updateCallback);
              }
            });
          } else {
            helpers.rmdirRec("tmp/" + socket.request.user.username + "/" + msg.fileName, "", socket.request.user._id, dirFileArray[0]);
          }
        });
        // delete file from all listening sockets
        var fileNameToSend = ""
        for (var i = 1; i < dirFileArray.length - 1; i++) {
          fileNameToSend = fileNameToSend + dirFileArray[i] + '/';
        }
        fileNameToSend += dirFileArray[dirFileArray.length - 1];
        helpers.deleteFileFromClient("tmp/" + room, fileNameToSend, room);

      // otherwise try to save the file
      } else {
        if (socket.request.user.totalNumberOfFiles >= maxFilesAllowed) {
          console.log("The file tmp/" + socket.request.user.username + "/" + msg.fileName + " could not be written since the user has reached the maximum file limit of " + maxFilesAllowed);
          helpers.sendMaxFileLimit(maxFilesAllowed, socket.id);
        } else if (socket.request.user.totalDirectorySize >= maxDirectorySizeAllowed) {
          console.log("The file tmp/" + socket.request.user.username + "/" + msg.fileName + " could not be written since the user has reached the maximum directory size limit of " + maxDirectorySizeAllowed + " bytes");
          helpers.sendMaxDirectorySizeLimit(maxDirectorySizeAllowed, socket.id);
        } else {
          // remember the directory this socket created so it can be deleted on disconnect
          if (!socket.directories) {
            socket.directories = {};
          }
          socket.directories[dirFileArray[0]] = true;

          var directory = "tmp" + "/" + socket.request.user.username;

          // try to create the directory followed by the file
          var createDirectory = function(index) {
            directory = directory + '/' + dirFileArray[index];
            if (index >= dirFileArray.length - 2) {
              fs.mkdir(directory, function(err) {
                createFile();
              });
            } else {
              fs.mkdir(directory, function(err) {
                createDirectory(index+1);
              });
            }
          }

          var createFile = function() {
            var fileSize;
            if (msg.fileContents) fileSize = msg.fileContents.length;
            if (fileSize && fileSize > maxFileSize) {
              console.log("The file tmp/" + socket.request.user.username + "/" + msg.fileName + " could not be written since it exceeds the maximum file size of " + maxFileSize);
            } else {
              // see if file exists already. If it doesn't, increment total number of files
              fs.stat("tmp/" + socket.request.user.username + "/" + msg.fileName, function(err, stats) {
                var exists = true;
                if (err) {
                  exists = false;
                }
                fs.writeFile("tmp/" + socket.request.user.username + "/" + msg.fileName, msg.fileContents, function(err) {
                    if (err) {
                      console.log("The file tmp/" + socket.request.user.username + "/" + msg.fileName + " could not be written due to:");
                      console.log(err);
                    } else {
                      if (!exists) {
                        mongoose.model('User').update({_id: socket.request.user._id}, {$inc: {totalNumberOfFiles: 1, totalDirectorySize: fileSize}}, updateCallback);
                        mongoose.model('User').update({_id: socket.request.user._id, "directories.name": dirFileArray[0]}, {$inc: {"directories.$.numberOfFiles": 1}}, updateCallback);
                      } else {
                        mongoose.model('User').update({_id: socket.request.user._id}, {$inc: {totalDirectorySize: (fileSize - stats.size)}}, updateCallback);
                      }
                      console.log("The file tmp/" + socket.request.user.username + "/" + msg.fileName + " was saved!");
                    }
                });

                // send file to all listening sockets
                var fileNameToSend = ""
                for (var i = 1; i < dirFileArray.length - 1; i++) {
                  fileNameToSend = fileNameToSend + dirFileArray[i] + '/';
                }
                fileNameToSend += dirFileArray[dirFileArray.length - 1];
                helpers.sendFileToClient("tmp/" + room, fileNameToSend, msg.fileContents, room);
              });
            }
          }

          fs.stat(directory + "/" + dirFileArray[0], function(err, stats) {
            if (err) {
              helpers.sendUserDirectory(socket.request.user.username, dirFileArray[0]);
            }
            fs.mkdir(directory, function(err) {
              createDirectory(0);
            });
          });
        }
      }
    }
    // add directory to user in mongo db if it doesn't exist
    mongoose.model('User').findOne({_id: socket.request.user._id, "directories.name": dirFileArray[0]}, function(err, user) {
      if (!user) {
        mongoose.model('User').update({_id: socket.request.user._id}, {$push: {directories: {name: dirFileArray[0], numberOfFiles: 0}}}, function(err, numAffected) {
          deleteOrSaveFile();
        });
      } else {
        deleteOrSaveFile();
      }
    });

    // mongoose.model('User').update({_id: socket.request.user._id}, {$addToSet: {directories: {name: dirFileArray[0], numberOfFiles: 0}}}, function(err, numAffected) {
    //   if (err) {
    //     console.log("Here with error!");
    //   }
    //   console.log("Here with:");
    //   console.log(msg);
    //
    //   deleteOrSaveFile();
    // });

  });
}

module.exports = onConnection;
