// import { visiojs } from "/visiojs/package/dist/visiojs.js";
import { visiojs } from "visiojs";
import { useEffect, useRef, useState } from "react";
import { createNodeMap } from "./visiojs_to_matrix.js";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import Box from "@mui/material/Box";
import Tooltip from '@mui/material/Tooltip';


import { initialState } from "./initialState.js";
import { addShapes } from "./common.js";

const shapesWithLabels = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  opamp: "U",
  vprobe: "X",
  iprobe: "Y",
};

const componentDefaults = {
  resistor: { value: 1000, unit: "KΩ" },
  capacitor: { value: 1, unit: "pF" },
  inductor: { value: 1, unit: "nH" },
};

const activeComponents = ["opamp", "resistor", "capacitor", "inductor"];
const probes = ["vprobe", "iprobe"];

//Add 0 to the end of the labels to make them unique
const initialLabels = {};
Object.keys(shapesWithLabels).forEach((key) => {
  initialLabels[key] = `${shapesWithLabels[key]}0`;
});

function calculateNextIndex(components, type, prefix) {
  if (!components) return initialLabels[type];
  if (Object.keys(components).length == 0) return initialLabels[type];
  // console.log("calculateNextIndex", type, prefix, components);
  const existingLabels = Object.keys(components)
    .filter((k) => components[k].type == type)
    .map((c) => Number(c.slice(1)));
  // console.log("existingLabels", type, existingLabels, Math.max(...existingLabels)+1);
  return `${prefix}${existingLabels.length == 0 ? 0 : Math.max(...existingLabels) + 1}`;
}

export function VisioJSSchematic({ setTextResult, setNodes, setComponents, oldComponents, setComponentValues, setFullyConnectedComponents }) {
  const initializedRef = useRef(false);
  const [history, setHistory] = useState({ pointer: 0, state: [] });
  const [nextComponent, setNextComponent] = useState(initialLabels);
  const [vjs, setVjs] = useState(null);

  const numUndos = 15;

  const trackHistory = (newState) => {
    console.log("state changed", newState);
    setTextResult("");

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

    console.log("newState", newState);
    const { nodeMap, components, fullyConnectedComponents } = createNodeMap(newState, addShapes);
    setFullyConnectedComponents(fullyConnectedComponents)
    // console.log("old c", {...components})
    //FIXME - remove these below lines
    for (const [key, value] of Object.entries(components)) {
      if (!(key in oldComponents) && value.type in componentDefaults) components[key] = { ...value, ...componentDefaults[value.type] };
      // console.log(key, value);
    }
    setComponentValues((oldValues) => {
      const newValues = { ...oldValues };
      for (const [key, value] of Object.entries(components)) {
        if (!(key in newValues) && value.type in componentDefaults) newValues[key] = { type: value.type, ...componentDefaults[value.type] };
        // console.log(key, value);
      }
      for (const key in newValues) {
        if (!(key in components)) delete newValues[key]; //remove components that are no longer present
      }

      return newValues;
    });
    // for (const c in components)
    // console.log("new c", {...components})

    setComponents(components);
    //the keys of components are the names of the components. Find the next available name for each component type
    console.log("components", components);
    const tempNewComponent = {};
    for (const key in shapesWithLabels) tempNewComponent[key] = calculateNextIndex(components, key, shapesWithLabels[key]);
    setNextComponent(tempNewComponent);

    //build the MNA matrix - do this after use clicks calculateMNA - FIXME
    setNodes(nodeMap);
    // build_and_solve_mna(nodeMap, 'vin', addShapes )
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

  // useEffect(() => {
  //   //in react safe-mode this is executed twice which really breaks d3 event listeners & drag behavior. Using a ref to prevent double-initialization
  //   if (initializedRef.current) return;
  //   initializedRef.current = true;
  //   vjs = visiojs({
  //     initialState: initialState,
  //     stateChanged: trackHistory,
  //   });
  //   vjs.init();
  // });

  useEffect(() => {
    var newVjs = visiojs({
      initialState: initialState,
      stateChanged: trackHistory,
    });
    setVjs(newVjs);
  }, []);

  useEffect(() => {
    if (vjs) vjs.init();
  }, [vjs]);

  const allowedToAdd = {};
  allowedToAdd["vin"] = !('iin' in oldComponents || 'vin' in oldComponents);
  allowedToAdd["vprobe"] = Object.keys(oldComponents).filter((k) => oldComponents[k].type == "vprobe").length < 2;
  // console.log("allowedToAdd", allowedToAdd);
  return (
    <span>
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div style={{ width: "100%" }}>
          <Box sx={{display:"flex", justifyContent:"space-between", width:"100%", my:1}}>
            <Box display="flex" gap={1}>
              {Object.keys(addShapes).map((key) => {
                const shape = addShapes[key];
                if ("label" in shape) shape.label.text = nextComponent[key];
                return (
                  <Tooltip title={key == "vin" && !allowedToAdd["vin"] ? "max 1 vin or iin " :
                                  key == "iin" && !allowedToAdd["vin"] ? "max 1 vin or iin " :
                                  key == "vprobe" && !allowedToAdd["vprobe"] ? "max 2 vprobes" :""
                    }>
                  <span key={key}>
                  <Button
                    variant="contained"
                    color={probes.includes(key) ? "secondary" : activeComponents.includes(key) ? "info" : "success"}
                    key={key}
                    style={{ cursor: "grab", marginRight: "10px", height: "100%" }}
                    size="small"
                    disabled={key == "vin" ? !allowedToAdd["vin"] : 
                              key == "iin" ? !allowedToAdd["vin"] :
                              key == "vprobe" ? !allowedToAdd["vprobe"] : false
                    }
                    draggable="true"
                    onDragStart={(e) => {
                      window.dragData = shape;
                      e.dataTransfer.setData("application/json", JSON.stringify(shape));
                    }}
                    onClick={() => vjs.addShape(shape)}
                  >
                    {key}
                  </Button>
                  </span>
                  </Tooltip>
                );
              })}
            </Box>
            <Box display="flex" gap={1}>
              <IconButton aria-label="delete" onClick={() => vjs.deleteSelected()}>
                <DeleteIcon />
              </IconButton>
              <IconButton aria-label="delete" onClick={() => undo()} disabled={history.pointer == 0}>
                <UndoIcon />
              </IconButton>
              <IconButton aria-label="delete" onClick={() => redo()} disabled={(history.pointer == history.state.length - 1)}>
                <RedoIcon />
              </IconButton>
              {/* <button style={{ display: "inline-block", marginRight: "10px" }} id="delete" onClick={() => vjs.deleteSelected()}>
            Delete
          </button>
          <button style={{ display: "inline-block", marginRight: "10px" }} id="undo" disabled={history.pointer == 0} onClick={() => undo()}>
            Undo
          </button>
          <button style={{ display: "inline-block" }} id="redo" disabled="${(history.pointer = history.state.length - 1)}" onClick={() => redo()}>
            Redo
          </button> */}
            </Box>
          </Box>
          <div>
            <div
              style={{
                border: "1px solid rgb(222, 226, 230)",
                display: "inline-block",
                width: "100%",
              }}
            >
              <svg id="visiojs_top" className="visiojs_svg"></svg>
            </div>
          </div>
        </div>
      </div>
    </span>
  );
}
