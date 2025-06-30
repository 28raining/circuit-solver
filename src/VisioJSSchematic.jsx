// import { visiojs } from "/visiojs/package/dist/visiojs.js";
import { visiojs } from "visiojs";
import { useEffect, useState, useCallback } from "react";
import { createNodeMap } from "./visiojs_to_matrix.js";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";

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

export function VisioJSSchematic({ setResults, setNodes, setComponentValues, setFullyConnectedComponents, history, setHistory }) {
  // const initializedRef = useRef(false);
  // const [history, setHistory] = useState({ pointer: 0, state: [] });
  const [nextComponent, setNextComponent] = useState(initialLabels);
  const [vjs, setVjs] = useState(null);
  const [oldComponents, setComponents] = useState({});

  const numUndos = 15;

  const regenerateNodeMaps = useCallback(
    (newState) => {
      // console.log("newState", newState);
      const { nodeMap, components, fullyConnectedComponents } = createNodeMap(newState, addShapes);

      for (const [key, value] of Object.entries(components)) {
        if (!(key in oldComponents) && value.type in componentDefaults) components[key] = { ...value, ...componentDefaults[value.type] };
      }
      setComponentValues((oldValues) => {
        const newValues = { ...oldValues };
        for (const [key, value] of Object.entries(components)) {
          if (!(key in newValues) && value.type in componentDefaults) newValues[key] = { type: value.type, ...componentDefaults[value.type] };
        }
        for (const key in newValues) {
          if (!(key in components)) delete newValues[key]; //remove components that are no longer present
        }
        if (JSON.stringify(oldValues) == JSON.stringify(newValues)) return oldValues;
        return newValues;
      });

      //if the state didn't change then return the same nodeMap to prevent re-rendering
      setFullyConnectedComponents((old) => {
        if (JSON.stringify(old) == JSON.stringify(fullyConnectedComponents)) return old;
        return fullyConnectedComponents;
      });
      // setFullyConnectedComponents(fullyConnectedComponents)
      setNodes((old) => {
        if (JSON.stringify(old) == JSON.stringify(nodeMap)) return old;
        else {
          setResults({ text: "", mathML: "", complexResponse: "", bilinearRaw: "", bilinearMathML: "" });
          return nodeMap;
        }
      });

      setComponents(components);
      //the keys of components are the names of the components. Find the next available name for each component type
      // console.log("components", components);
      const tempNewComponent = {};
      for (const key in shapesWithLabels) tempNewComponent[key] = calculateNextIndex(components, key, shapesWithLabels[key]);
      setNextComponent(tempNewComponent);

      //build the MNA matrix - do this after use clicks calculateMNA - FIXME
      // build_and_solve_mna(nodeMap, 'vin', addShapes )
    },
    [oldComponents, setComponentValues, setFullyConnectedComponents, setNodes, setResults],
  );

  const trackHistory = useCallback(
    (newState) => {
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
      regenerateNodeMaps(newState);
    },
    [regenerateNodeMaps, setHistory],
  );

  const undo = useCallback(() => {
    //when undo is called form useeffect it receives stale state. Therefore, all state accessing is done inside the setHistory function
    setHistory((old_h) => {
      if (old_h.pointer == 0) return old_h; //no more undos
      vjs.redraw(old_h.state[old_h.pointer - 1]);
      const h = { ...old_h };
      h.pointer = h.pointer - 1;
      return h;
    });
    regenerateNodeMaps(history.state[history.pointer - 1]);
  }, [regenerateNodeMaps, setHistory, history, vjs]);

  const redo = useCallback(() => {
    setHistory((old_h) => {
      if (old_h.pointer >= old_h.state.length - 1) return old_h; //no more redos
      vjs.redraw(old_h.state[old_h.pointer + 1]);
      const h = { ...old_h };
      h.pointer = h.pointer + 1;
      return h;
    });
    regenerateNodeMaps(history.state[history.pointer + 1]);
  }, [regenerateNodeMaps, setHistory, history, vjs]);

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
    if (!vjs) {
      var newVjs = visiojs({
        initialState: history.state[0],
        stateChanged: trackHistory,
      });
      setVjs(newVjs);
    }
  }, [trackHistory, history, vjs]);

  useEffect(() => {
    if (vjs) vjs.init();
  }, [vjs]);

  //capture keypresses
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
      const isRedo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey;

      if (isUndo) {
        console.log("undo");
        e.preventDefault(); // optional: prevent default browser undo
        undo();
      } else if (isRedo) {
        e.preventDefault(); // optional: prevent default browser redo
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const allowedToAdd = {};
  allowedToAdd["vin"] = !("iin" in oldComponents || "vin" in oldComponents);
  allowedToAdd["vprobe"] = Object.keys(oldComponents).filter((k) => oldComponents[k].type == "vprobe").length < 2;
  // console.log("allowedToAdd", allowedToAdd);
  return (
    <Grid container spacing={1} sx={{ mt: 1 }}>
      <Grid container size={{ xs: 12, sm: 10 }} columns={{ xs: 3, md: 9 }}>
        {Object.keys(addShapes).map((key) => {
          const shape = addShapes[key];
          if ("label" in shape) shape.label.text = nextComponent[key];
          return (
            <Grid size={1} key={key}>
              <Tooltip
                key={key}
                title={
                  key == "vin" && !allowedToAdd["vin"]
                    ? "max 1 vin or iin "
                    : key == "iin" && !allowedToAdd["vin"]
                      ? "max 1 vin or iin "
                      : key == "vprobe" && !allowedToAdd["vprobe"]
                        ? "max 2 vprobes"
                        : ""
                }
              >
                <span>
                  <Button
                    variant="contained"
                    fullWidth
                    color={probes.includes(key) ? "secondary" : activeComponents.includes(key) ? "info" : "success"}
                    key={key}
                    style={{ cursor: "grab", marginRight: "10px", height: "100%" }}
                    size="small"
                    disabled={key == "vin" ? !allowedToAdd["vin"] : key == "iin" ? !allowedToAdd["vin"] : key == "vprobe" ? !allowedToAdd["vprobe"] : false}
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
            </Grid>
          );
        })}
      </Grid>
      <Grid container size={{ xs: 12, sm: 2 }} spacing={0} justifyContent="flex-end">
        <IconButton aria-label="delete" onClick={() => vjs.deleteSelected()} sx={{ p: 0.5 }}>
          <DeleteIcon />
        </IconButton>
        <IconButton aria-label="delete" onClick={() => undo()} disabled={history.pointer == 0} sx={{ p: 0.5 }}>
          <UndoIcon />
        </IconButton>
        <IconButton aria-label="delete" onClick={() => redo()} disabled={history.pointer == history.state.length - 1} sx={{ p: 0.5 }}>
          <RedoIcon />
        </IconButton>
      </Grid>
      <Grid container size={12}>
        <Grid size={12}>
          <div
            style={{
              border: "1px solid rgb(222, 226, 230)",
              display: "inline-block",
              width: "100%",
            }}
          >
            <svg id="visiojs_top" className="visiojs_svg"></svg>
          </div>
        </Grid>
      </Grid>
    </Grid>
  );
}
