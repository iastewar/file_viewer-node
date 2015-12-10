var File = React.createClass({
  showFile: function() {
    this.props.notifyParent(this.props.fileContents);
  },
  render: function() {
    return <button onClick={this.showFile}>
              {this.props.fileName}
           </button>;
  }
})

var FileList = React.createClass({
  render: function() {
    var counter = 0;
    var t = this;
    var files = [];
    for (var fileName in this.props.files) {
      if (this.props.files.hasOwnProperty(fileName)) {
        files.push(<File key={counter} fileName={fileName} fileContents={this.props.files[fileName]} notifyParent={this.props.notifyParent}/>);
      }
      counter++;
    }
    return <div>
              {files}
           </div>;
  }
});

var FileView = React.createClass({
  getInitialState: function() {
    return {text: ""}
  },
  swapView: function(file) {
    if (this.state.text !== file) {
      this.setState({text: file})
    } else {
      this.setState({text: ""});
    }
  },
  render: function() {
    return <div>
            <FileList files={this.props.files} notifyParent={this.swapView}/>
            <div style={{whiteSpace: "pre-wrap"}}>{this.state.text}</div>
          </div>
  }
})

//ReactDOM.render(<FileView files={{}} />, document.getElementById('container'));

var files = {};

$(function(){
  var socket = io();
  
  function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  socket.emit('connect folder', directoryName);

  socket.on('send file', function(msg){
    files[msg.fileName] = ab2str(msg.fileContents);
    ReactDOM.render(<FileView files={files} />, document.getElementById('container'));
    //$('#file').append("<div><h2>" + msg.fileName + "</h2>" + ab2str(msg.fileContents) + "</div>");
  });

  socket.on('send directory error', function() {
    $('#file').text("Folder does not exist");
  })
});
