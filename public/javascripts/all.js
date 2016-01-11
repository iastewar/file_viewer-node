$(function() {
  $("#nav-form").on("submit", function() {
    var owner = $("#nav-form input").val();
    window.location = "/" + owner;
    event.preventDefault();
  });
});
