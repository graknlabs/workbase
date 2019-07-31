const collect = (array, current) => array.concat(current);
let selectedNodes = null;

export function dimNotHighlightedNodesAndEdges(connectedNodes, connectedEdges) {
  const nodesToUpdate =
    this.getNode()
      .filter(x => !connectedNodes.includes(x.id))
      .map(x => ({ id: x.id, color: x.color.dimmedColor, font: { color: x.font.dimmedColor } }))
      .reduce(collect, []);

  const edgesToUpdate =
    this.getEdges()
      .filter(edge => !connectedEdges.includes(edge.id))
      .map(edge => ({
        id: edge.id,
        color: {
          color: edge.color.color.replace('1)', '0.2)'),
          highlight: edge.color.highlight,
          hover: edge.color.hover,
        },
      }))
      .reduce(collect, []);
  this.updateEdge(edgesToUpdate);
  this.updateNode(nodesToUpdate);
}

export function setDefaultColoursOnDimmedElements(connectedNodes, connectedEdges) {
  const nodesToUpdate =
    this.getNode()
      .filter(x => !connectedNodes.includes(x.id))
      .map(x => ({ id: x.id, color: x.colorClone, font: x.fontClone }))
      .reduce(collect, []);

  const edgesToUpdate =
    this.getEdges()
      .filter(x => !connectedEdges.includes(x.id))
      .map(edge => ({
        id: edge.id,
        color: {
          color: edge.color.color.replace('0.2)', '1)'),
          highlight: edge.color.highlight,
          hover: edge.color.hover,
        },
      })).reduce(collect, []);

  this.updateNode(nodesToUpdate);
  this.updateEdge(edgesToUpdate);
}

export function showEdgeLabels(edges) {
  const edgesToUpdate =
    edges.map(edge => ({ id: edge.id, arrows: { to: { enabled: true, scaleFactor: 0.3 } }, label: edge.hiddenLabel }))
      .reduce(collect, []);

  this.updateEdge(edgesToUpdate);
}

export function hideEdgeLabels(edges) {
  const edgesToUpdate =
    edges.map(edge => ({ id: edge.id, arrows: { to: { enabled: false } }, label: '' }))
      .reduce(collect, []);

  this.updateEdge(edgesToUpdate);
}

export function removeLabelsOnNotConncetedEdges(nodeId) {
  const connectedEdges = this.getNetwork().getConnectedEdges(nodeId);
  const edgesToUpdate = this.getEdges()
    .filter(x => !connectedEdges.includes(x.id))
    .map(edge => ({ id: edge.id, arrows: { to: { enabled: false } }, label: '' }))
    .reduce(collect, []);

  this.updateEdge(edgesToUpdate);
}

export function showLabelsOnEdgesConnectedToNode(nodeId) {
  const connectedEdgeIds = this.getNetwork().getConnectedEdges(nodeId);
  const connectedEdges = this.getEdges(connectedEdgeIds);
  const isLabelShown = connectedEdges.length && connectedEdges[0].showLabel;
  if (!isLabelShown) {
    // Hide labels on ALL edges before showing the ones on connected edges
    this.hideEdgeLabels(this.getEdges());
  }

  if (!isLabelShown) {
    // Show labels on connected edges
    this.showEdgeLabels(connectedEdges);
  }
}

/*
* Events handlers
*/

export function onDragEnd(params) {
  // Fix the position of all the dragged nodes
  params.nodes.forEach((nodeId) => {
    this.updateNode({ id: nodeId, fixed: { x: true, y: true } });
  });
}

export function onDragStart(params) {
  if (!params.nodes.length) return;
  // Release the position of all the nodes that are about to be dragged
  params.nodes.forEach((nodeId) => {
    this.updateNode({ id: nodeId, fixed: { x: false, y: false } });
  });
  const nodeId = params.nodes[0];
  const isLabelShown = this.getEdges()[0].showLabel;
  if (!isLabelShown) { this.removeLabelsOnNotConncetedEdges(nodeId); }
}

export function onSelectNode(params) {
  selectedNodes = params.nodes;
  const nodeId = params.nodes[0];
  this.showLabelsOnEdgesConnectedToNode(nodeId);
}

export function onClick(params) {
  if (!params.nodes.length) selectedNodes = null;
}

export function onContext(params) {
  const nodeId = this.getNetwork().getNodeAt(params.pointer.DOM);
  if (nodeId && !selectedNodes) {
    this.showLabelsOnEdgesConnectedToNode(nodeId);
    this.getNetwork().selectNodes([nodeId], true);
  }
}

export function onHoverNode(params) {
  const nodeId = params.node;
  const connectedEdgeIds = this.getNetwork().getConnectedEdges(nodeId);
  const connectedEdges = this.getEdges(connectedEdgeIds);
  let connectedNodes = this.getNetwork().getConnectedNodes(nodeId).concat(nodeId);

  if (connectedEdges.length && !connectedEdges[0].showLabel) {
    // Show labels on connected edges
    this.showEdgeLabels(connectedEdges);
  }

  // Highlight neighbour nodes
  connectedNodes.forEach((id) => { this.highlightNode(id); });

  if (selectedNodes) {
    connectedNodes = connectedNodes.concat(selectedNodes);
  }
  // Dim remaining nodes in network
  this.dimNotHighlightedNodesAndEdges(connectedNodes, connectedEdgeIds);
}


export function onBlurNode(params) {
  const nodeId = params.node;
  const connectedEdges = [];
  // When node is deleted do not get connected edges
  if (this.nodeExists(nodeId)) {
    const connectedEdgeIds = this.getNetwork().getConnectedEdges(nodeId);
    const connectedEdges = this.getEdges(connectedEdgeIds);
    const isNodeSelected = this.getNetwork().getSelectedNodes().includes(nodeId);
    const isLabelShown = connectedEdges.length && connectedEdges[0].showLabel;
    if (!isNodeSelected && !isLabelShown) {
      // Hide labels on connected edges - if the blurred node is not selected
      this.hideEdgeLabels(connectedEdges);
    }
  }
  const connectedNodes = this.getNetwork().getConnectedNodes(nodeId).concat(nodeId);

  // Remove highlighting from neighbours nodes
  connectedNodes.forEach((id) => { this.removeHighlightNode(id); });
  // Put colour back to the nodes
  this.setDefaultColoursOnDimmedElements(connectedNodes, connectedEdges);
}

export function onDeselectNode(params) {
  const nodeId = params.previousSelection.nodes[0];
  const connectedNodes = this.getNetwork().getConnectedNodes(nodeId).concat(nodeId);
  const edges = this.getEdges();
  const isLabelShown = edges[0].showLabel;
  if (!isLabelShown) {
    // Hide labels on ALL edges before showing the ones on connected edges
    this.hideEdgeLabels(edges);
  }

  // Remove highlighting from neighbours nodes
  connectedNodes.forEach((id) => { this.removeHighlightNode(id); });
}
