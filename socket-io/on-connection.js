var fs = require('fs');
var helpers = require('./helpers');
var mongoose = require('mongoose');

var maxFileSize = 20971520;                  // the total number of bytes allowed per file
var maxFilesAllowed = 10000;                 // the total number of files allowed per user
var maxDirectorySizeAllowed = 104857600;     // the total number of bytes allowed per user

var onConnection = function(socket) {
  helpers.sendInitialMessages(socket);

  socket.on('delete folder', function(msg) {
    var updateCallback = function(err, numAffected) {
      helpers.sendUserStats(socket);
    }

    if (socket.request.user.logged_in) {
      if (socket.directories && socket.directories[msg]) {
        helpers.sendDeleteUserDirectory(socket.request.user.username, msg);
        mongoose.model('User').update({_id: socket.request.user._id}, {$pull: {directories: {name: msg}}}, updateCallback);
        helpers.rmdirRec("tmp/" + socket.request.user.username + "/" + msg, "", socket.request.user._id, null, function() {
          fs.rmdir("tmp/" + socket.request.user.username, function(err) {
            helpers.sendUserStats(socket);
            if (!err) {
              helpers.sendUserDirectoryEmpty(socket.request.user.username);
              mongoose.model('User').update({_id: socket.request.user._id}, {$set: {totalDirectorySize: 0, totalNumberOfFiles: 0, directories: []}}, updateCallback);
            }
          });
        });
      }
    }
  })

  socket.on('disconnect', function() {
    var updateCallback = function(err, numAffected) {
    }

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
                  mongoose.model('User').update({_id: socket.request.user._id}, {$set: {totalDirectorySize: 0, totalNumberOfFiles: 0, directories: []}}, updateCallback);
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
        helpers.sendSentFolder(socket.id, msg);
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

  socket.on('send folder', function(msg) {
    if (!helpers.isAuthenticated(socket)) {
      return;
    }
    // add directory to user in mongo db if it doesn't exist
    mongoose.model('User').findOne({_id: socket.request.user._id, "directories.name": msg}, function(err, user) {
      if (!user) {
        mongoose.model('User').update({_id: socket.request.user._id}, {$push: {directories: {name: msg, numberOfFiles: 0, directorySize: 0, ready: false}}}, function(err, numAffected) {

        });
      }
    });
  });

  socket.on('sent folder', function(msg) {
    if (!helpers.isAuthenticated(socket)) {
      return;
    }

    // if directory exists, let users know it is ready for viewing and let sender know that directory has been uploaded successfully
    mongoose.model('User').update({_id: socket.request.user._id, "directories.name": msg}, {$set: {"directories.$.ready": true}}, function(err, numAffected) {
    });

    mongoose.model('User').findOne({_id: socket.request.user._id, "directories.name": msg}, function(err, user) {
      if (user) {
        helpers.sendUserDirectory(socket.request.user.username, msg);
        helpers.sendDirectorySentSuccessfully(socket.id, msg);
      }
    });

  });

  // socket.on('send subfolder', function(msg) {
  //
  // });
  //
  // socket.on('sent subfolder', function(msg) {
  //
  // });

  socket.on('send file', function(msg) {
    if (!helpers.isAuthenticated(socket)) {
      return;
    }

    msg = JSON.parse(msg);
    if (msg.fileContents) {
      msg.fileContents = new Uint8Array(msg.fileContents.data).buffer;
      msg.fileContents = helpers.toBuffer(msg.fileContents)
    }

    // get directory of file
    var dirFileArray = msg.fileName.split("/");
    var room = socket.request.user.username + "/" + dirFileArray[0];

    var updateCallback = function(err, numAffected) {
      helpers.sendUserStats(socket);
      helpers.sendDirectoryStats(socket, dirFileArray[0]);
    }

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
                mongoose.model('User').update({_id: socket.request.user._id, "directories.name": dirFileArray[0]}, {$inc: {"directories.$.numberOfFiles": -1, "directories.$.directorySize": -stats.size}}, updateCallback);
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
        mongoose.model('User').findOne({_id: socket.request.user._id}, function(err, socketUser) {
          if (socketUser.totalNumberOfFiles >= maxFilesAllowed) {
            console.log("The file tmp/" + socket.request.user.username + "/" + msg.fileName + " could not be written since the user has reached the maximum file limit of " + maxFilesAllowed);
            helpers.sendMaxFileLimit(maxFilesAllowed, socket.id);
          } else if (socketUser.totalDirectorySize >= maxDirectorySizeAllowed) {
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
              var fileSize = 0;
              if (!msg.fileContents) {
                return;
              }
              fileSize = msg.fileContents.length;
              if (fileSize > maxFileSize) {
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
                          mongoose.model('User').update({_id: socket.request.user._id, "directories.name": dirFileArray[0]}, {$inc: {"directories.$.numberOfFiles": 1, "directories.$.directorySize": fileSize}}, updateCallback);
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

            fs.mkdir(directory, function(err) {
              createDirectory(0);
            });
          }
        });
      }
    }
    // if directory for user in mongo db exists, continue
    mongoose.model('User').findOne({_id: socket.request.user._id, "directories.name": dirFileArray[0]}, function(err, user) {
      if (user) {
        deleteOrSaveFile();
      }
    });
  });
}

module.exports = onConnection;
