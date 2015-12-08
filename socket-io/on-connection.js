var fs = require('fs');
var helpers = require('./helpers');

var onConnection = function(socket) {
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
            helpers.rmdirAsync("tmp/" + msg.fileName);
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
        helpers.sendFileToClient(room, fileNameToSend, msg.fileContents, room);
      }
    });
  });
}

module.exports = onConnection;
