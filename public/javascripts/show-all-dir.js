$(function() {
  $(".well").on("click", function() {
    var repository = $(this).attr("data");
    window.location = "/" + repository;
  });
});
