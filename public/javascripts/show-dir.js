var socket = io();

var filesRetrieved = 0;
var totalNumberOfFiles;

var historyMessages = 0;
var historySizeLimit = 50;
var historyScrolledToBottom = true;

var TreeNode = React.createClass({
  getInitialState: function() {
    return {visible: false, open: false};
  },
  toggle: function() {
    this.setState({visible: !this.state.visible});
    this.setState({open: !this.state.open});
    if (this.props.node.fileContents) {
      this.props.notifyParent(this.props.node.name, this.props.node.fileContents, this.props.node.fullName);
    }
  },
  render: function() {
    var childNodes;
    var t = this;
    if (this.props.node.childNodes) {
      childNodes = this.props.node.childNodes.map(function(node, index) {
        return <div key={index}><TreeNode node={node} selectedFile={t.props.selectedFile} notifyParent={t.props.notifyParent} depth={t.props.depth + 1}/></div>
      });
    }

    var childStyle = {};
    if (!this.state.visible) {
      childStyle = {display: "none"};
    }

    var folderClass;
    var caretClass;
    if (this.state.open) {
      folderClass = "fa fa-folder-open";
      caretClass = "fa fa-caret-down";
    } else {
      folderClass = "fa fa-folder";
      caretClass = "fa fa-caret-right";
    }

    var style = {};
    if (this.props.node.fullName === this.props.selectedFile) {
      style = {padding: "1px 15px 1px 15px", backgroundColor: "#454b54", cursor: "pointer", color: "white", borderTop: "1px solid black", borderBottom: "1px solid black"}
    } else {
      style = {padding: "1px 15px 1px 15px", cursor: "pointer"}
    }

    var node;
    if (this.props.node.childNodes) {
      node = <div className={caretClass}> <div className={folderClass}> {this.props.node.name}</div></div>;
    } else {
      node = <div className="fa fa-file-text-o"> {this.props.node.name}</div>;
    }

    var space = "";
    for (var i = 0; i < this.props.depth; i++) {
      space += "\u2003 \u2002"
    }

    return (
      <div>
        <div onClick={this.toggle} style={style} className="backgroundDiv">
          {space}
          {node}
        </div>
        <div style={childStyle}>
          {childNodes}
        </div>
      </div>
    );
  }
});

var FileView = React.createClass({
  componentDidMount: function () {
    this.highlightCode();
  },
  componentDidUpdate: function () {
    this.highlightCode();
  },
  highlightCode: function () {
    var domNode = ReactDOM.findDOMNode(this);
    var nodes = domNode.querySelectorAll('pre code');
    for (var i = 0; i < nodes.length; i++) {
      var fileNameArray = nodes[i].className.split(".");
      if (fileNameArray.length > 1) {
        var ext = fileNameArray[fileNameArray.length - 1];
        switch (ext) {
          case "rb":
            nodes[i].className = "rb";
            break;
          case "yml":
            nodes[i].className = "yml";
            break;
          case "js":
            nodes[i].className = "js";
            break;
          case "java":
            nodes[i].className = "java";
            break;
          case "css":
            nodes[i].className = "css";
            break;
          case "cs":
            nodes[i].className = "cs";
            break;
          case "cpp":
          case "c":
          case "h":
            nodes[i].className = "cpp";
            break;
          case "coffee":
            nodes[i].className = "coffee";
            break;
          case "http":
            nodes[i].className = "http";
            break;
          case "erb":
            nodes[i].className = "erb";
            break;
          case "json":
            nodes[i].className = "json";
            break;
          default:
            nodes[i].className = "";
        }
      }

      hljs.highlightBlock(nodes[i]);
    }
  },
  getInitialState: function() {
    return {fileName: "No file selected", fileContents: "", fullFileName: ""}
  },
  swapView: function(fileName, fileContents, fullFileName) {
    this.setState({fileName: fileName});
    this.setState({fileContents: fileContents});
    this.setState({fullFileName: fullFileName});
  },
  componentWillReceiveProps: function() {
    var findContents = function(node, fullFileName) {
      if (node.fullName === fullFileName) {
        return node.fileContents;
      }
      if (!node.childNodes) {
        return;
      }
      var childrenLength = node.childNodes.length;
      for (var i = 0; i < childrenLength; i++) {
        var fileContents = findContents(node.childNodes[i], fullFileName);
        if (fileContents) {
          return fileContents;
        }
      }
    }

    this.setState({fileContents: findContents(this.props.node, this.state.fullFileName)});
  },
  render: function() {

    var lineNumbers = [];
    if (this.state.fileContents) {
      var lines = this.state.fileContents.split("\n");
      var len = lines.length;
      for (var i = 0; i < len; i++) {
        lineNumbers.push(<div key={i} className="line-number">{i+1}</div>);
      }
    }


    return <div id="fileView">
            <div id="fileTree">
              <div id="fixed-fileTree">
                <TreeNode node={this.props.node} selectedFile={this.state.fullFileName} notifyParent={this.swapView} depth={0}/>
              </div>
            </div>
            <div id="fileContents">
              <pre><div className="lines">{lineNumbers}</div><code className={this.state.fileName}>{this.state.fileContents}</code></pre>
            </div>
          </div>
  }
});
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
    var element = document.getElementById("history-chat-contents");
    element.scrollTop = element.scrollHeight - element.clientHeight;
  }
}

var addToHistory = function(fileName, addition, deletion) {
  var element = document.getElementById("history-chat-contents");
  historyScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 1;

  if (historyMessages < historySizeLimit) {
    historyMessages++;
  } else {
    $("#history-chat-contents div:first").remove();
  }
  var date = new Date();
  var currentTime = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  if (addition) {
    $("#history-chat-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-addition'>New:</b>" +
        "<div class='history-message-file'>" + fileName + "</div>" +
        "<div class='history-message-timestamp'>" + currentTime + "</div>" +
      "</div>"
    )
  } else if (deletion) {
    $("#history-chat-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-deletion'>Delete:</b>" +
        "<div class='history-message-file'>" + fileName + "</div>" +
        "<div class='history-message-timestamp'>" + currentTime + "</div>" +
      "</div>"
    )
  } else {
    $("#history-chat-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-edit'>Edit:</b>" +
        "<div class='history-message-file'>" + fileName + "</div>" +
        "<div class='history-message-timestamp'>" + currentTime + "</div>" +
      "</div>"
    )
  }
  updateHistoryScroll();
}

$(function() {
  $("#hide-history").on("click", function() {
    if ($("#history-chat-container").css("display") === "none") {
      $("#history-chat-container").show("slide", {direction: "right"}, 50, function() {
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
      $("#history-chat-container").hide("slide", {direction: "right"}, 50);

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
        if ($("#history-chat-container").css("display") === "none") {
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

      if ($("#history-chat-container").css("display") === "none") {
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
    $("#history-chat-container").show();
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
