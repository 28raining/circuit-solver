import { visiojs } from "/visiojs/package/dist/visiojs.js";
import htm from "../js/htm.js";
import React from "https://unpkg.com/es-react@16.13.1/dev/react.js";
import ReactDOM from "https://unpkg.com/es-react@16.13.1/dev/react-dom.js";

const html = htm.bind(React.createElement);

var initialState = {
  settings: {
    defaultZoom: 0.75,
  },
};

var vjs;

const addShapes = {
  opamp: {
    shape: "opamp.svg",
    connectors: [
      { x: 0, y: 64 },
      { x: 0, y: 128 },
      { x: 128, y: 96 },
    ],
    x: 0,
    y: 0,
  },
  vin: {
    shape: "vin.svg",
    connectors: [{ x: 64, y: 0 }],
    x: 0,
    y: 0,
  },
  resistor: {
    shape: "resistor.svg",
    connectors: [
      { x: 16, y: 48 },
      { x: 112, y: 48 },
    ],
    x: 0,
    y: 0,
    label: {
      text: "R1",
      class: "circuit_label",
      x: 64,
      y: 14,
    },
  },
  capacitor: {
    shape: "capacitor.svg",
    connectors: [
      { x: 48, y: 32 },
      { x: 48, y: 112 },
    ],
    x: 0,
    y: 0,
    label: {
      text: "C1",
      class: "circuit_label",
      x: 48,
      y: 24,
    },
  },
  inductor: {
    shape: "inductor.svg",
    connectors: [
      { x: 16, y: 64 },
      { x: 144, y: 64 },
    ],
    x: 0,
    y: 0,
    label: {
      text: "L1",
      class: "circuit_label",
      x: 80,
      y: 32,
    },
  },
  gnd: {
    shape: "gnd.svg",
    connectors: [{ x: 64, y: 16 }],
    x: 0,
    y: 0,
  },
  vout: {
    shape: "vout.svg",
    connectors: [{ x: 16, y: 64 }],
    x: 0,
    y: 0,
  },
};

function elementMapper(s) {
  const shapeType = s.shape.split(".")[0];
  console.log("elementMapper", s.shape, shapeType);
  if (s.shape == "vin.svg") return { type: "vin", name: "vin" };
  else if (s.shape == "vout.svg") return { type: "vout", name: "xvout" };
  else if (s.shape == "gnd.svg") return { type: "gnd", name: "gnd" };
  else return { type: shapeType, name: s.label.text };
}

function createNodeMap(newState) {
  var mnaNodeMap = [];
  //use this object to track how many connections each component has
  const instantiatedComponents = {};
  newState.shapes.map((s) => {
    var z = elementMapper(s);
    instantiatedComponents[z.name] = { type: z.type, numConnections: 0 };
  });

  // const numConnections = Object.fromEntries(instantiatedComponents.map(s=>s.name));
  //initialize every value in object to 0
  // for (const key in numConnections) numConnections[key] = 0;

  var vin_node, start, end, nodeFound, index, node;
  for (const w of newState.wires) {
    if (w == null) continue; //skip deleted wires
    const startEl = elementMapper(newState.shapes[w.start.shapeID]);
    const endEl = elementMapper(newState.shapes[w.end.shapeID]);
    if (startEl.type == "gnd" || endEl.type == "gnd") continue; //skip any node connected to ground

    start = { ...startEl, port: w.start.connectorID };
    end = { ...endEl, port: w.end.connectorID };
    instantiatedComponents[startEl.name].numConnections += 1;
    instantiatedComponents[endEl.name].numConnections += 1;

    nodeFound = false;
    for (index in mnaNodeMap) {
      node = mnaNodeMap[index];

      for (const conn_index in node) {
        const conn = node[conn_index];
        if (conn.name == start.name && conn.port == start.port) {
          mnaNodeMap[index].push(end);
          nodeFound = true;
        } else if (conn.name == end.name && conn.port == end.port) {
          mnaNodeMap[index].push(start);
          nodeFound = true;
        }
      }
    }
    if (!nodeFound) mnaNodeMap.push([start, end]);
  }
  console.log("new node map", mnaNodeMap);
  console.log("instantiatedComponents", instantiatedComponents);
}

export function VisioJSSchematic() {
  const initializedRef = React.useRef(false);
  const [history, setHistory] = React.useState({ pointer: 0, state: [] });

  const numUndos = 15;

  const trackHistory = (newState) => {
    // console.log("state changed", newState);
    setHistory((old_h) => {
      const deepCopyState = JSON.parse(JSON.stringify(newState));
      const h = { ...old_h };
      //there was an undo, then a new state was created. Throwing away the future history
      if (h.pointer < h.state.length - 1) h.state = h.state.slice(0, h.pointer + 1);
      if (h.state.length == numUndos) h.state = [...h.state.slice(1), deepCopyState];
      else h.state = [...h.state, deepCopyState];
      h.pointer = h.state.length - 1;
      return h;
    });

    // createNodeMap(newState);
  };

  function undo() {
    //when undo is called form useeffect it receives stale state. Therefore, all state accessing is done inside the setHistory function
    setHistory((old_h) => {
      if (old_h.pointer == 0) return old_h; //no more undos
      vjs.redraw(old_h.state[old_h.pointer - 1]);
      const h = { ...old_h };
      h.pointer = h.pointer - 1;
      return h;
    });
  }

  function redo() {
    setHistory((old_h) => {
      if (old_h.pointer >= old_h.state.length - 1) return old_h; //no more redos
      vjs.redraw(old_h.state[old_h.pointer + 1]);
      const h = { ...old_h };
      h.pointer = h.pointer + 1;
      return h;
    });
  }

  React.useEffect(() => {
    //in react safe-mode this is executed twice which really breaks d3 event listeners & drag behavior. Using a ref to prevent double-initialization
    if (initializedRef.current) return;
    initializedRef.current = true;
    vjs = visiojs({
      initialState: initialState,
      stateChanged: trackHistory,
    });
    vjs.init();
  });
  return html`
    <span>
      <div style=${{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div style=${{ width: "100%", marginTop: "50px" }}>
          ${Object.keys(addShapes).map((key) => {
            const shape = addShapes[key];
            return html`<button
              key=${key}
              style=${{ display: "inline-block", cursor: "grab", marginRight: "10px" }}
              draggable="true"
              onDragStart=${(e) => {
                window.dragData = shape;
                e.dataTransfer.setData("application/json", JSON.stringify(shape));
              }}
              onClick=${() => vjs.addShape(shape)}
            >
              ${key}
            </button>`;
          })}
          <button
            style=${{ display: "inline-block", marginRight: "10px" }}
            id="delete"
            onClick=${() => vjs.deleteSelected()}
          >
            Delete
          </button>
          <button
            style=${{ display: "inline-block", marginRight: "10px" }}
            id="undo"
            disabled=${history.pointer == 0}
            onClick=${() => undo()}
          >
            Undo
          </button>
          <button
            style=${{ display: "inline-block" }}
            id="redo"
            disabled="${(history.pointer = history.state.length - 1)}"
            onClick=${() => redo()}
          >
            Redo
          </button>

          <div>
            <div
              style=${{
                border: "1px solid rgb(222, 226, 230)",
                display: "inline-block",
                width: "100%",
              }}
            >
              <svg id="visiojs_top" className="visiojs_svg"></svg>
            </div>
          </div>

          <input type="text" />
        </div>
      </div>
    </span>
  `;
}
