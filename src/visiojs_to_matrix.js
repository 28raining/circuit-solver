import { assignSympySymbols } from "./circuitIds.js";

function elementMapper(s) {
  const shapeType = s.image.split(".")[0];
  const displayName = s.label ? s.label.text : "";
  if (s.image == "vin.svg") return { type: "vin", circuitId: "vin", displayName: "vin" };
  if (s.image == "iin.svg") return { type: "iin", circuitId: "iin", displayName: "iin" };
  else if (s.image == "gnd.svg") return { type: "gnd", circuitId: "gnd", displayName: "gnd" };
  return { type: shapeType, circuitId: s.circuitId, displayName };
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
    components[z.circuitId] = { type: z.type, displayName: z.displayName, portConnections: Array(s.connectors.length).fill(false) };
  });

  var start, end, index;
  var vin_node = null;
  var crushedNodes = [];
  for (const w of newState.wires) {
    if (w == null) continue; //skip deleted wires
    const startEl = elementMapper(newState.shapes[w.start.shapeID]);
    const endEl = elementMapper(newState.shapes[w.end.shapeID]);

    start = { ...startEl, port: w.start.connectorID };
    end = { ...endEl, port: w.end.connectorID };
    components[startEl.circuitId].portConnections[w.start.connectorID] = true;
    components[endEl.circuitId].portConnections[w.end.connectorID] = true;
    crushedNodes.push([start, end]);
  }

  var wasChanged;
  do {
    wasChanged = false;
    outerLoop: for (index in crushedNodes) {
      for (const conn_index in crushedNodes[index]) {
        const conn = crushedNodes[index][conn_index];
        for (const nodeIndex in crushedNodes) {
          if (nodeIndex == index) continue; //skip the current node
          const node = crushedNodes[nodeIndex];
          for (const conn2_index in node) {
            const conn2 = node[conn2_index];
            if (conn.circuitId == conn2.circuitId && conn.port == conn2.port) {
              crushedNodes[nodeIndex] = [...crushedNodes[nodeIndex], ...crushedNodes[index]];
              crushedNodes.splice(index, 1);
              wasChanged = true;
              break outerLoop;
            }
          }
        }
      }
    }
  } while (wasChanged);

  outerLoop: for (const index in crushedNodes) {
    const node = crushedNodes[index];
    for (const conn of node) {
      if (conn.type == "gnd") {
        crushedNodes.splice(index, 1);
        break outerLoop;
      }
    }
  }

  for (const n in crushedNodes) {
    for (let i = 0; i < crushedNodes[n].length; i++) {
      const conn = crushedNodes[n][i];
      for (let j = i + 1; j < crushedNodes[n].length; j++) {
        const conn2 = crushedNodes[n][j];
        if (conn.circuitId == conn2.circuitId && conn.port == conn2.port) {
          crushedNodes[n].splice(j, 1);
          j--;
        }
      }
    }
  }
  nodeMapPre = crushedNodes;

  for (const [key, value] of Object.entries(components)) {
    if (value.portConnections.includes(false)) {
      for (const node in nodeMapPre) {
        nodeMapPre[node] = nodeMapPre[node].filter((c) => c.circuitId != key);
      }
    }
  }

  for (const node in nodeMapPre) {
    for (const conn of nodeMapPre[node]) {
      if (conn.type == "vin") vin_node = node;
      else if (conn.type == "iin") vin_node = node;
    }
  }
  if (vin_node !== null) {
    var connected_nodes = [vin_node];
    var connected_elements = nodeMapPre[vin_node].map((c) => c.circuitId);
    var pushed;
    for (var i = 0; i < connected_elements.length; i++) {
      for (const node in nodeMapPre) {
        if (connected_nodes.includes(node)) continue;
        pushed = false;
        for (const conn of nodeMapPre[node]) {
          if (connected_elements.includes(conn.circuitId)) {
            if (!pushed) connected_nodes.push(node);
            pushed = true;
            connected_elements.push(...nodeMapPre[node].map((c) => c.circuitId).filter((c) => !connected_elements.includes(c)));
          }
        }
      }
    }

    nodeMap = connected_nodes.map((node) => nodeMapPre[node]);
    nodeMap.forEach((node, i) => {
      node.forEach((comp) => {
        if (!(comp.circuitId in fullyConnectedComponents)) {
          fullyConnectedComponents[comp.circuitId] = {
            ports: Array(addShapes[comp.type].connectors.length).fill(null),
            type: comp.type,
            displayName: comp.displayName,
          };
        }
        fullyConnectedComponents[comp.circuitId].ports[comp.port] = i;
      });
    });
  }

  assignSympySymbols(fullyConnectedComponents);

  return { nodeMap, components, fullyConnectedComponents };
}
