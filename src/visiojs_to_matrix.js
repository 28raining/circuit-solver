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
    if (!("connectors" in s)) return; //skip shapes without connectors
    var z = elementMapper(s);
    //use portConnections because a cap can have 2 wires to 1 port. We need to check every port is connected...
    components[z.name] = { type: z.type, portConnections: Array(s.connectors.length).fill(false) };
  });

  // const numConnections = Object.fromEntries(components.map(s=>s.name));
  //initialize every value in object to 0
  // for (const key in numConnections) numConnections[key] = 0;

  var start, end, nodeFound, index, node;
  var vin_node = null;
  var crushedNodes = [];
  for (const w of newState.wires) {
    if (w == null) continue; //skip deleted wires
    const startEl = elementMapper(newState.shapes[w.start.shapeID]);
    const endEl = elementMapper(newState.shapes[w.end.shapeID]);

    start = { ...startEl, port: w.start.connectorID };
    end = { ...endEl, port: w.end.connectorID };
    components[startEl.name].portConnections[w.start.connectorID] = true;
    components[endEl.name].portConnections[w.end.connectorID] = true;
    crushedNodes.push([start, end])

    // if (startEl.type == "gnd" || endEl.type == "gnd") continue; //don't add ground nodes to the node map

    // nodeFound = false;
    // for (index in nodeMapPre) {
    //   node = nodeMapPre[index];
    //   for (const conn_index in node) {
    //     const conn = node[conn_index];
    //     if (conn.name == start.name && conn.port == start.port) {
    //       nodeMapPre[index].push(end);
    //       nodeFound = true;
    //     } else if (conn.name == end.name && conn.port == end.port) {
    //       nodeMapPre[index].push(start);
    //       nodeFound = true;
    //     }
    //   }
    // }
    // if (!nodeFound) nodeMapPre.push([start, end]);
  }
  // console.log("new node map",  JSON.parse(JSON.stringify(nodeMapPre)));

  var wasChanged
  do {
    wasChanged = false;
    outerLoop: for (index in crushedNodes) {
      // node = crushedNodes[index];
      for (const conn_index in crushedNodes[index]) {
        const conn = crushedNodes[index][conn_index];
        //check if conn exists in any other node, then merge the nodes
        for (const nodeIndex in crushedNodes) {
          if (nodeIndex == index) continue; //skip the current node
          const node = crushedNodes[nodeIndex];
          for (const conn2_index in node) {
            const conn2 = node[conn2_index];
            if (conn.name == conn2.name && conn.port == conn2.port) {
              // console.log("found a match", conn, conn2, "in node", node);
              //merge the nodes
              // if (nodeIndex != index) {
                // console.log("merging nodes", index, "and", nodeIndex);
                crushedNodes[nodeIndex] = [...crushedNodes[nodeIndex], ...crushedNodes[index]];
                crushedNodes.splice(index, 1);
                wasChanged = true;
                break outerLoop; //break to avoid checking the rest of the connections
              // }
            }
          }
        }
      }
    }

  } while (wasChanged);

  //delete the node containing gnd
  outerLoop : for (const index in crushedNodes) {
    const node = crushedNodes[index];
    for (const conn of node) {
      if (conn.type == "gnd") {
        // console.log("found gnd node", node, "at index", index);
        crushedNodes.splice(index, 1);
        break outerLoop; //break to avoid checking the rest of the connections
      }
    }
  }

  //remove duplicates from crushedNodes
  for (const n in crushedNodes) {
    for (let i = 0; i < crushedNodes[n].length; i++) {
      const conn = crushedNodes[n][i];
      for (let j = i + 1; j < crushedNodes[n].length; j++) {
        const conn2 = crushedNodes[n][j];
        // console.log("conns", conn, conn2);
        if (conn.name == conn2.name && conn.port == conn2.port) {
          // console.log("found a duplicate", conn, "in node", crushedNodes[n]);
          crushedNodes[n].splice(j, 1); //remove the duplicate
          j--; //decrement j to account for the removed element
        }
      }
    }
  }
  // console.log("crushedNodes", crushedNodes);
  nodeMapPre = crushedNodes;

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
            connected_elements.push(...nodeMapPre[node].map((c) => c.name).filter((c) => !connected_elements.includes(c)));
            // break; //break to avoid checking the rest of the connections
          }
        }
      }
    }
    // console.log("connected nodes to vin 2", connected_nodes);
    // console.log("connected elements to vin", connected_elements);

    // const nodeMap = nodeMapPre.filter(node => connected_nodes.includes(node));
    // console.log("pre map", nodeMapPre)
    nodeMap = connected_nodes.map((node) => nodeMapPre[node]);
    // console.log("final node map", nodeMap);
    //find all nodes that have a path to vin_node

    // for (i = 0; i < nodeArray.length; i++) {
    nodeMap.forEach((node, i) => {
      // for (j = 0; j < nodeArray[i].length; j++) {
      node.forEach((comp) => {
        // element = comp.name;
        if (!(comp.name in fullyConnectedComponents)) {
          fullyConnectedComponents[comp.name] = {
            ports: Array(addShapes[comp.type].connectors.length).fill(null),
            type: comp.type,
          };
        }
        fullyConnectedComponents[comp.name].ports[comp.port] = i;
      });
    });
  }

  return { nodeMap, components, fullyConnectedComponents };
}
