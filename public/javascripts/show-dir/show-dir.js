module.exports = function(historySizeLimit) {

var React = require('react');
var ReactDOM = require('react-dom');

var FileView = require('./file-view');

var socket = io();

var filesRetrieved = 0;
var totalNumberOfFiles;

var historyMessages = 0;
var historyScrolledToBottom = true;

var fileTree = {};

// returns true if a new file is added, false if an existing file is changed, and null if nothing happens.
var addToFileTree = function(fileTree, fileNameArray, length, index, fileName, fileContents) {
  fileTree.name = fileNameArray[index];
  if (index === length - 1) {
    if (fileTree.fileContents === fileContents) {
      return null;
    }
    fileTree.fileContents = fileContents;
    if (fileTree.fullName) {
      return false;
    } else {
      fileTree.fullName = fileName;
      return true;
    }
  }
  if (!fileTree.childNodes) {
    fileTree.childNodes = [{name: fileNameArray[index + 1]}];
    return addToFileTree(fileTree.childNodes[0], fileNameArray, length, index + 1, fileName, fileContents);
  } else {
    var childrenLength = fileTree.childNodes.length;
    for (var i = 0; i < childrenLength; i++) {
      if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
        return addToFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1, fileName, fileContents);
      }
    }
    fileTree.childNodes.push({name: fileNameArray[index + 1]});
    return addToFileTree(fileTree.childNodes[fileTree.childNodes.length - 1], fileNameArray, length, index + 1, fileName, fileContents);
  }
}

// returns true if file is removed, null otherwise
var removeFromFileTree = function(fileTree, fileNameArray, length, index) {
  if (fileTree.name !== fileNameArray[index]) {
    return null;
  }
  var childrenLength = fileTree.childNodes.length;
  for (var i = 0; i < childrenLength; i++) {
    if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
      if (index === length - 2) {
        fileTree.childNodes.splice(i, 1);
        return true;
      }
      return removeFromFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1);
    }
  }
  return null;
}

var ab2str = function(buffer) {
  var bufView = new Uint8Array(buffer);
  var length = bufView.length;
  var result = "";
  for (var i = 0; i < length; i += 65535) {
      var addition = 65535;
      if (i + 65535 > length) {
          addition = length - i;
      }
      result += String.fromCharCode.apply(null, bufView.subarray(i,i+addition));
  }

  return result;

}

var sendDirectoryError = function(msg) {
  $("#loading-bar-container").html("Problem retrieving directory " + msg + ". Either repository does not exist, or the server is experiencing problems").addClass("alert alert-danger");
  $("h1").html("Not Found!");
}

function updateHistoryScroll(){
  if (historyScrolledToBottom) {
    var element = document.getElementById("history-contents");
    element.scrollTop = element.scrollHeight - element.clientHeight;
  }
}

var addToHistory = function(fileName, addition, deletion) {
  var element = document.getElementById("history-contents");
  historyScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 1;

  if (historyMessages < historySizeLimit) {
    historyMessages++;
  } else {
    $("#history-contents div:first").remove();
  }
  var date = new Date();
  var currentTime = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  if (addition) {
    $("#history-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-addition'>New:</b>" +
        "<a class='history-message-file'>" + fileName + "</a>" +
        "<span class='history-message-timestamp'>" + currentTime + "</span>" +
      "</div>"
    )
  } else if (deletion) {
    $("#history-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-deletion'>Delete:</b>" +
        "<a class='history-message-file'>" + fileName + "</a>" +
        "<span class='history-message-timestamp'>" + currentTime + "</span>" +
      "</div>"
    )
  } else {
    $("#history-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-edit'>Edit:</b>" +
        "<a class='history-message-file'>" + fileName + "</a>" +
        "<span class='history-message-timestamp'>" + currentTime + "</span>" +
      "</div>"
    )
  }
  updateHistoryScroll();
}

$(function() {
  $("#history-container").on("click", ".history-message-file", function() {
    ReactDOM.render(<FileView node={fileTree} fullFileName={$(this).html()} />, document.getElementById('file-view-container'));
  });

  $("#hide-history").on("click", function() {
    if ($("#history-container").css("display") === "none") {
      $("#history-container").show("slide", {direction: "right"}, 50, function() {
        if ($("#fileTree").css("display") === "none") {
          $("#fileContents").css("width", "80%");
        } else {
          $("#fileContents").css("width", "60%");
        }
      });
      $(this).css("left", "80%");
      $(this).css("right", "");
      $(this).removeClass("fa-caret-left");
      $(this).addClass("fa-caret-right");
    } else {
      $("#history-container").hide("slide", {direction: "right"}, 50);

      if ($("#fileTree").css("display") === "none") {
        $("#fileContents").css("width", "100%");
      } else {
        $("#fileContents").css("width", "80%");
      }
      $(this).css("left", "");
      $(this).css("right", "5px");
      $(this).removeClass("fa-caret-right");
      $(this).addClass("fa-caret-left");
    }
  });

  $("#hide-fileTree").on("click", function() {
    if ($("#fileTree").css("display") === "none") {
      $("#fileTree").show("slide", {direction: "left"}, 50, function() {
        if ($("#history-container").css("display") === "none") {
          $("#fileContents").css("width", "80%");
        } else {
          $("#fileContents").css("width", "60%");
        }
        $("#fileContents").css("left", "20%")
      });
      $(this).css("right", "80%");
      $(this).css("left", "");
      $(this).removeClass("fa-caret-right");
      $(this).addClass("fa-caret-left");
    } else {
      $("#fileTree").hide("slide", {direction: "left"}, 50);

      if ($("#history-container").css("display") === "none") {
        $("#fileContents").css("width", "100%");
      } else {
        $("#fileContents").css("width", "80%");
      }
      $("#fileContents").css("left", "0px")
      $(this).css("right", "");
      $(this).css("left", "5px");
      $(this).removeClass("fa-caret-left");
      $(this).addClass("fa-caret-right");
    }
  });

  $("#directory-name-header").on("mouseenter", function() {
    $("#hide-history").show();
    $("#hide-fileTree").show();
  }).on("mouseleave", function() {
    $("#hide-history").hide();
    $("#hide-fileTree").hide();
  });

});

socket.emit('connect folder', directoryName);

socket.on('connected', function(msg) {
  totalNumberOfFiles = msg.numberOfFiles;
  $("#loading-bar-container").html(
    "<div>Loading " + directoryName + "...</div>" +
    "<div id='progress-bar'></div>"
  );
  $("#progress-bar").progressbar({max: totalNumberOfFiles})
});

socket.on('send file', function(msg){
  msg = JSON.parse(msg);
  if (msg.fileContents) msg.fileContents = new Uint8Array(msg.fileContents.data).buffer;
  var fileNameArray = msg.fileName.split("/");

  var added;
  var changed;
  var deleted;
  if (msg.deleted) {
    changed = removeFromFileTree(fileTree, fileNameArray, fileNameArray.length, 0);
    deleted = true;
  } else {
    changed = addToFileTree(fileTree, fileNameArray, fileNameArray.length, 0, msg.fileName, ab2str(msg.fileContents));
    if (changed) added = true;
    else if (changed === false) changed = true;
  }

  if (changed && filesRetrieved === totalNumberOfFiles - 1) {
    filesRetrieved++;
    ReactDOM.render(<FileView node={fileTree} />, document.getElementById('file-view-container'));
    $("#loading-bar-container").hide();
    $("#history-container").show();
    $("#directory-name-header").show();
  } else if (changed && filesRetrieved > totalNumberOfFiles - 1) {
    ReactDOM.render(<FileView node={fileTree} />, document.getElementById('file-view-container'));
    if (fileNameArray[fileNameArray.length - 1] !== ".DS_Store")
      addToHistory(msg.fileName, added, deleted);
  } else {
    filesRetrieved++;
    $("#progress-bar").progressbar("value", filesRetrieved);
  }
});

socket.on('send directory error', sendDirectoryError);

}
