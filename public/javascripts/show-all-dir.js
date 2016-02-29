var socket = io();

var userFolders = {};

$(function() {
  $("#container").on("click", ".user-folder", function() {
    var repository = owner + "/" + $(this).text();
    window.location = "/" + repository;
  });
});

socket.emit('show user folders', owner);

socket.on('user folder', function(msg) {
  if ($("#loading-spinner").length !== 0) {
    $("#loading-spinner").remove();
    $("#container").show();
  }
  else if ($("#error-message").length !== 0) {
    $("#error-message").remove();
    $("#container").show();
  }

  if (!userFolders[msg.name]) {
    $("#container").append("<div class='user-folder'><span class='fa fa-folder' style='margin-right: 5px;'></span>" + msg.name + "</div>");
    userFolders[msg.name] = true;
  }
});

socket.on('delete user folder', function(msg) {
  $(".user-folder:contains('" + msg.name + "')").remove();
  delete userFolders[msg.name];
});

socket.on('user folder empty', function(msg) {
  if ($("#loading-spinner").length !== 0) {
    $("#loading-spinner").remove();
  }
  $("#container").html("");
  $("#container").hide();
  $("#error-message-container").html("<div id='error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
  userFolders = {};
});
