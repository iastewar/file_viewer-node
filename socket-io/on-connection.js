var fs = require('fs');
var helpers = require('./helpers');

var onConnection = function(socket) {
  socket.on('delete folder', function() {
    if (socket.request.user.logged_in) {
      helpers.rmdirRec("tmp/" + socket.request.user.username, "");
    }
  })

  // socket.on('disconnect', function() {
  //   if (socket.request.user.logged_in) {
  //     if (socket.directories) {
  //       for (var dir in socket.directories) {
  //         if (socket.directories.hasOwnProperty(dir)) {
  //           helpers.rmdirRec("tmp/" + socket.request.user.username + "/" + dir, "", function() {
  //             fs.rmdir("tmp/" + socket.request.user.username, function(err) {
  //
  //             });
  //           });
  //         }
  //       }
  //     }
  //   }
  // });

  socket.on('connect folder', function(msg) {
    helpers.sendDirectoryToSingleClient(socket, msg, function(err) {
      if (!err) {
        socket.join(msg);
        console.log("socket joined room " + msg);
      } else {
        console.log("problem sending directory to client")
      }
    });
  });

  socket.on('disconnect folder', function(msg) {
    socket.leave(msg);
    console.log("socket left room " + msg);
  });

  socket.on('send file', function(msg) {
    if (!helpers.isAuthenticated(socket)) {
      return;
    }

    // get directory of file to be saved
    var dirFileArray = msg.fileName.split("/");

    // remember the directory this socket created so it can be deleted on disconnect
    if (!socket.directories) {
      socket.directories = {};
    }
    socket.directories[dirFileArray[0]] = null;

    var room = socket.request.user.username + "/" + dirFileArray[0];
    var directory = "tmp" + "/" + socket.request.user.username;
    // create the user directory
    fs.mkdir(directory, function(err) {
      for (var i = 0; i < dirFileArray.length - 1; i++) {
        directory = directory + '/' + dirFileArray[i];
      }

      // try to create the directory
      fs.mkdir(directory, function(err) {
        // if file should be deleted, delete it
        if (msg.deleted) {
          fs.stat("tmp/" + socket.request.user.username + "/" + msg.fileName, function(err, stats) {
            if (!stats) {
              return;
            }
            if (stats.isFile()) {
              fs.unlink("tmp/" + socket.request.user.username + "/" + msg.fileName, function(err) {
              });
            } else {
              helpers.rmdirRec("tmp/" + socket.request.user.username + "/" + msg.fileName, "");
            }
          });
          // delete file from all listening sockets
          var fileNameToSend = ""
          for (var i = 1; i < dirFileArray.length - 1; i++) {
            fileNameToSend = fileNameToSend + dirFileArray[i] + '/';
          }
          fileNameToSend += dirFileArray[dirFileArray.length - 1];
          helpers.deleteFileFromClient(room, fileNameToSend, room);

        // otherwise, save the file and send it to all listening sockets
        } else {
          fs.writeFile("tmp/" + socket.request.user.username + "/" + msg.fileName, msg.fileContents, function(err) {
              console.log("The file was saved!");
          });

          // send file to all listening sockets
          var fileNameToSend = ""
          for (var i = 1; i < dirFileArray.length - 1; i++) {
            fileNameToSend = fileNameToSend + dirFileArray[i] + '/';
          }
          fileNameToSend += dirFileArray[dirFileArray.length - 1];
          helpers.sendFileToClient(room, fileNameToSend, msg.fileContents, room);
        }
      });
    })

  });
}

module.exports = onConnection;
