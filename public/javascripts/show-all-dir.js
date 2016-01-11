var socket = io();


$(function() {
  $("#container").on("click", ".user-folder", function() {
    var repository = owner + "/" + $(this).text();
    window.location = "/" + repository;
  });
});

socket.emit('show user folders', owner);

socket.on('user folder', function(msg) {
  if ($("#error-message").length !== 0) {
    $("#error-message").remove();
  }
  $("#container").append("<div class='user-folder'><span class='fa fa-folder' style='margin-right: 15px;'></span>" + msg.name + "</div>");
});

socket.on('delete user folder', function(msg) {
  $(".user-folder:contains('" + msg.name + "')").remove();
});

socket.on('user folder empty', function(msg) {
  $("#container").html("<div id='error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
});
