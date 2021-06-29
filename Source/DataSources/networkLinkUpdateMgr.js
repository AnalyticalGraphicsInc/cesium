export default function networkLinkUpdateMgr() {
  var kmlSources = [];

  return {
    addLink: function (href, kml, dataSource) {
      kmlSources[href.request.url] = {
        kml: kml,
        dataSource: dataSource,
      };
    },

    processUpdate: function (updateNode) {
      processUpdate(kmlSources, updateNode);
    },
  };
}

function processUpdate(kmlSources, updateNode) {
  var source = kmlSources[getUpdateTargetHref(updateNode)];
  if (!source) return;

  processUpdateNode(source.kml, updateNode);
  source.dataSource.load(source.kml).then(function () {
    source.dataSource._changed.raiseEvent(source);
  });
}

function getUpdateTargetHref(updateNode) {
  return updateNode.getElementsByTagName("targetHref")[0].innerHTML;
}

function processUpdateNode(kmlRoot, updateNode) {
  forEachChild(updateNode, function (child) {
    switch (child.tagName) {
      case "Change":
        processChangeNodes(kmlRoot, child);
        break;
      case "Create":
        processCreateNodes(kmlRoot, child);
        break;
      case "Delete":
        processDeleteNode(kmlRoot, child);
        break;
    }
  });
}

function processChangeNodes(root, changeNode) {
  forEachChild(changeNode, function (child) {
    processChangeNode(root, child);
  });
}

function processChangeNode(root, newNode) {
  var oldNode = root.getElementById(newNode.getAttribute("targetId"));

  forEachChild(newNode, function (newProp) {
    var oldProp = oldNode.getElementsByTagName(newProp.tagName)[0];
    oldNode.replaceChild(newProp, oldProp);
  });
}

function processCreateNodes(root, createNode) {
  forEachChild(createNode, function (child) {
    processCreateNode(root, child);
  });
}

function processCreateNode(root, newParent) {
  var oldParent = root.getElementById(newParent.getAttribute("targetId"));

  forEachChild(newParent, function (child) {
    oldParent.appendChild(child);
  });
}

function processDeleteNode(root, deleteNode) {
  forEachChild(deleteNode, function (child) {
    var nodeToDelete = root.getElementById(child.getAttribute("targetId"));
    if (!nodeToDelete) return;

    nodeToDelete.parentNode.removeChild(nodeToDelete);
  });
}

function forEachChild(parent, callback) {
  var children = parent.children.slice();
  for (var i = 0; i < children.length; i++) {
    callback(children[i]);
  }
}
