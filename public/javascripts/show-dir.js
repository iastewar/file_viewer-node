var TreeNode = React.createClass({
  getInitialState: function() {
    return {visible: false, open: false};
  },
  toggle: function() {
    this.setState({visible: !this.state.visible});
    this.setState({open: !this.state.open});
    if (this.props.node.fileContents) {
      this.props.notifyParent(this.props.node.name, this.props.node.fileContents);
    }
  },
  render: function() {
    var childNodes;
    var t = this;
    if (this.props.node.childNodes) {
      childNodes = this.props.node.childNodes.map(function(node, index) {
        return <div key={index}><TreeNode node={node} notifyParent={t.props.notifyParent}/></div>
      });
    }

    var style = {marginLeft: "25px"};
    if (!this.state.visible) {
      style = {marginLeft: "25px", display: "none"};
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

    var node;
    if (this.props.node.childNodes) {
      node = <div className={caretClass}> <div onClick={this.toggle} style={{cursor: "pointer"}} className={folderClass}> {this.props.node.name}</div></div>;
    } else {
      node = <div onClick={this.toggle} style={{cursor: "pointer"}} className="fa fa-file-text-o"> {this.props.node.name}</div>;
    }

    return (
      <div>
        {node}
        <div style={style}>
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
    if (nodes.length > 0) {
      for (var i = 0; i < nodes.length; i++) {
        hljs.highlightBlock(nodes[i]);
      }
    }
  },
  getInitialState: function() {
    return {fileName: "No file selected", fileContents: ""}
  },
  swapView: function(fileName, fileContents) {
    this.setState({fileName: fileName});
    this.setState({fileContents: fileContents});
  },
  componentWillReceiveProps: function() {
    var findContents = function(node, fileName) {
      if (node.name === fileName) {
        return node.fileContents;
      }
      if (!node.childNodes) {
        return;
      }
      var childrenLength = node.childNodes.length;
      for (var i = 0; i < childrenLength; i++) {
        var fileContents = findContents(node.childNodes[i], fileName);
        if (fileContents) {
          return fileContents;
        }
      }
    }

    this.swapView(this.state.fileName, findContents(this.props.node,this.state.fileName));
  },
  render: function() {
    return <div className="row">
            <div id="fileTree" className="col-md-3"><TreeNode node={this.props.node} notifyParent={this.swapView}/></div>
            <div id="fileContents" className="col-md-9">
              <div className="panel panel-default">
                <div className="panel-heading">
                  <h3 className="panel-title">{this.state.fileName}</h3>
                </div>
                <div className="panel-body">
                  <pre><code>{this.state.fileContents}</code></pre>
                </div>
              </div>
            </div>
          </div>
  }
})

//ReactDOM.render(<FileView files={{}} />, document.getElementById('container'));

//var files = {};

// var fileTree = {name: "howdy",
//   childNodes: [
//     {name: "bobby"},
//     {name: "suzie", childNodes: [
//       {name: "puppy", childNodes: [
//         {name: "dog house"}
//       ]},
//       {name: "cherry tree"}
//     ]}
//   ]};
//
// ReactDOM.render(<TreeNode node={fileTree} />, document.getElementById('container'));

var fileTree = {};

var addToFileTree = function(fileTree, fileNameArray, length, index, fileContents) {
  if (index === length - 1) {
    fileTree.fileContents = fileContents;
    return;
  }
  fileTree.name = fileNameArray[index];
  if (!fileTree.childNodes) {
    fileTree.childNodes = [{name: fileNameArray[index + 1]}];
    addToFileTree(fileTree.childNodes[0], fileNameArray, length, index + 1, fileContents);
  } else {
    var flag = false;
    var childrenLength = fileTree.childNodes.length;
    for (var i = 0; i < childrenLength; i++) {
      if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
        addToFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1, fileContents);
        flag = true;
      }
    }
    if (!flag) {
      fileTree.childNodes.push({name: fileNameArray[index + 1]});
      addToFileTree(fileTree.childNodes[fileTree.childNodes.length - 1], fileNameArray, length, index + 1, fileContents);
    }
  }

}


$(function(){
  var socket = io();

  function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

  socket.emit('connect folder', directoryName);


  socket.on('send file', function(msg){
    if (msg.deleted) {
      //delete files[msg.fileName];
    } else {
      //files[msg.fileName] = ab2str(msg.fileContents);

      //console.log(msg.fileName);

      var fileNameArray = msg.fileName.split("/");

      addToFileTree(fileTree, fileNameArray, fileNameArray.length, 0, ab2str(msg.fileContents));

      //console.log(fileTree);

      ReactDOM.render(<FileView node={fileTree} />, document.getElementById('container'));


     }
    //ReactDOM.render(<TreeNode node={fileTree} />, document.getElementById('container'));
    //$('#file').append("<div><h2>" + msg.fileName + "</h2>" + ab2str(msg.fileContents) + "</div>");
  });



  // socket.on('send file', function(msg){
  //   if (msg.deleted) {
  //     delete files[msg.fileName];
  //   } else {
  //     files[msg.fileName] = ab2str(msg.fileContents);
  //   }
  //   ReactDOM.render(<FileView files={files} />, document.getElementById('container'));
  //   //$('#file').append("<div><h2>" + msg.fileName + "</h2>" + ab2str(msg.fileContents) + "</div>");
  // });

  socket.on('send directory error', function() {
    $('#file').text("Folder does not exist");
  })
});
