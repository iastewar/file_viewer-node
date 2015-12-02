$(function(){
  var socket = io();
  $('form').submit(function(){
   socket.emit('chat message', $('#m').val());
   $('#m').val('');
   event.preventDefault();
  });

  socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
  });
});
