$(function(){
  var socket = io();
  // $('form').submit(function(){
  //  socket.emit('chat message', $('#m').val());
  //  $('#m').val('');
  //  event.preventDefault();
  // });

  // converts an ArrayBuffer to a String
  function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  socket.emit('connect folder', directoryName);

  socket.on('send file', function(msg){
    $('#file').text(msg.fileName + ab2str(msg.fileContents));
  });

  socket.on('send directory error', function() {
    $('#file').text("Folder does not exist");
  })
});
