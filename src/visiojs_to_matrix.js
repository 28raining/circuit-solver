function elementMapper(s) {
  const shapeType = s.image.split(".")[0];
  const name = s.label ? s.label.text : "";
  if (s.image == "vin.svg") return { type: "vin", name: "vin" };
  if (s.image == "iin.svg") return { type: "iin", name: "iin" };
  // else if (s.image == "vout.svg") return { type: "vprobe", name: "X0" };
  else if (s.image == "gnd.svg") return { type: "gnd", name: "gnd" };
  else return { type: shapeType, name: name };
}

//convert from visiojs json to array of nodes which are connected to vin
export function createNodeMap(newState, addShapes) {
  var nodeMapPre = [];
  //use this object to track how many connections each component has
  const components = {};
        const fullyConnectedComponents = {};

  var nodeMap = [];
  newState.shapes.map((s) => {
    if (s === null) return; //skip deleted shapes
    if (!('connectors' in s)) return; //skip shapes without connectors
    var z = elementMapper(s);
    //use portConnections because a cap can have 2 wires to 1 port. We need to check every port is connected...
    components[z.name] = { type: z.type, portConnections: Array(s.connectors.length).fill(false) }; 
  });

  // const numConnections = Object.fromEntries(components.map(s=>s.name));
  //initialize every value in object to 0
  // for (const key in numConnections) numConnections[key] = 0;

  var vout_node, start, end, nodeFound, index, node;
  var vin_node = null;
  for (const w of newState.wires) {
    if (w == null) continue; //skip deleted wires
    const startEl = elementMapper(newState.shapes[w.start.shapeID]);
    const endEl = elementMapper(newState.shapes[w.end.shapeID]);

    start = { ...startEl, port: w.start.connectorID };
    end = { ...endEl, port: w.end.connectorID };
    components[startEl.name].portConnections[w.start.connectorID] = true;
    components[endEl.name].portConnections[w.end.connectorID] = true;

    if (startEl.type == "gnd" || endEl.type == "gnd") continue; //don't add ground nodes to the node map

    nodeFound = false;
    for (index in nodeMapPre) {
      node = nodeMapPre[index];

      for (const conn_index in node) {
        const conn = node[conn_index];
        if (conn.name == start.name && conn.port == start.port) {
          nodeMapPre[index].push(end);
          nodeFound = true;
        } else if (conn.name == end.name && conn.port == end.port) {
          nodeMapPre[index].push(start);
          nodeFound = true;
        }
      }
    }
    if (!nodeFound) nodeMapPre.push([start, end]);
  }
  console.log("new node map", nodeMapPre);
  console.log("components", components);

  //remove components that are not fully connected
  for (const [key, value] of Object.entries(components)) {
    if (value.portConnections.includes(false)) {
      for (const node in nodeMapPre) {
        nodeMapPre[node] = nodeMapPre[node].filter((c) => c.name != key);
      }
    }
  }
  // console.log("skinny node map", nodeMapPre);

  //find the node connected to vin;
  for (const node in nodeMapPre) {
    for (const conn of nodeMapPre[node]) {
      if (conn.type == "vin") vin_node = node;
      else if (conn.type == "iin") vin_node = node;
      // else if (conn.type == "vprobe") vout_node = node;
    }
  }
  if (vin_node !== null) {
    // console.error("No vin or vout node found in the node map");
  // } else {
    var connected_nodes = [vin_node];
    var connected_elements = nodeMapPre[vin_node].map((c) => c.name);
    var pushed;
    for (var i = 0; i < connected_elements.length; i++) {
      for (const node in nodeMapPre) {
        // console.log("checking node", node, connected_nodes, connected_nodes.includes(node), i);
        if (connected_nodes.includes(node)) continue; //skip already connected nodes
        pushed = false;
        for (const conn of nodeMapPre[node]) {
          if (connected_elements.includes(conn.name)) {
            if (!pushed) connected_nodes.push(node);
            pushed = true;
            connected_elements.push(
              ...nodeMapPre[node].map((c) => c.name).filter((c) => !connected_elements.includes(c))
            );
            // break; //break to avoid checking the rest of the connections
          }
        }
      }
    }
    // console.log("connected nodes to vin 2", connected_nodes);
    // console.log("connected elements to vin", connected_elements);

    // const nodeMap = nodeMapPre.filter(node => connected_nodes.includes(node));
    nodeMap = connected_nodes.map(node => nodeMapPre[node]);
    // console.log("final node map", nodeMap);
    //find all nodes that have a path to vin_node

  // for (i = 0; i < nodeArray.length; i++) {
  nodeMap.forEach((node, i) => {
    // for (j = 0; j < nodeArray[i].length; j++) {
    node.forEach((comp, j) => {
      // element = comp.name;
      if (!(comp.name in fullyConnectedComponents)) {
        fullyConnectedComponents[comp.name] = {
          ports: Array(addShapes[comp.type].connectors.length).fill(null),
          type: comp.type,
        };
      }
      fullyConnectedComponents[comp.name].ports[comp.port] = i;

      // //FIXME - can these maps be eliminated now fullyConnectedComponents is more detailed?
      // if (comp.type == "opamp") {
      //   if (!(comp.name in opAmpsMap)) opAmpsMap[comp.name] = [null, null, null];
      //   opAmpsMap[comp.name][comp.port] = i;
      // // } else if (comp.type == "iprobe") {
      // //   if (!(comp.name in iprbMap)) iprbMap[comp.name] = [null, null];
      // //   iprbMap[comp.name][comp.port] = i;
      // //   if (comp.port == 0) iprbNode = i;
      // }
    });
  });

  }


  return {nodeMap, components, fullyConnectedComponents};
}