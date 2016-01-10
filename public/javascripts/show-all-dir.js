var socket = io();


$(function() {
  $("#container").on("click", ".well", function() {
    var repository = owner + "/" + $(this).html();
    window.location = "/" + repository;
  });
});

socket.emit('show user folders', owner);

socket.on('user folder', function(msg) {
  if ($("#error-message").length !== 0) {
    $("#error-message").remove();
  }
  $("#container").append("<div class='well'>" + msg.name + "</div>");
});

socket.on('delete user folder', function(msg) {
  $(".well:contains('" + msg.name + "')").remove();
});

socket.on('user folder empty', function(msg) {
  $("#container").html("<div id='error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
});
