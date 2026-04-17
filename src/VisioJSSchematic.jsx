// import { visiojs } from "/visiojs/package/dist/visiojs.js";
import visiojs from "visiojs";
import { useEffect, useState, useRef } from "react";
import { createNodeMap } from "./visiojs_to_matrix.js";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";

import { addShapes, emptyResults } from "./common.js";
import { nextDefaultLabel, commitLabelForType } from "./componentNaming.js";

const shapesWithLabels = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  vcvs: "A",
  vcis: "G",
  opamp: "U",
  vprobe: "X",
  iprobe: "Y",
};

const componentDefaults = {
  resistor: { value: 1000, unit: "KΩ" },
  capacitor: { value: 1, unit: "pF" },
  inductor: { value: 1, unit: "nH" },
  vcvs: { value: 100, unit: "V/V" },
  vcis: { value: 1e-3, unit: "A/V" },
};

const activeComponents = ["opamp", "resistor", "capacitor", "inductor", "vcvs", "vcis"];
const probes = ["vprobe", "iprobe"];

//Add 0 to the end of the labels to make them unique
const initialLabels = {};
Object.keys(shapesWithLabels).forEach((key) => {
  initialLabels[key] = `${shapesWithLabels[key]}0`;
});

function calculateNextLabel(components, type) {
  const names = Object.values(components)
    .filter((c) => c.type === type)
    .map((c) => c.sympyName);
  return nextDefaultLabel(type, names) || initialLabels[type];
}

export function VisioJSSchematic({ schematicApiRef, setResults, setNodes, setComponentValues, setFullyConnectedComponents, setSchematicComponents, history, setHistory }) {
  const [nextComponent, setNextComponent] = useState(initialLabels);
  const [vjs, setVjs] = useState(null);
  const [oldComponents, setComponents] = useState({});
  const historyRef = useRef(history);
  const vjsRef = useRef(null);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    vjsRef.current = vjs;
  }, [vjs]);

  const numUndos = 15;

  function regenerateNodeMaps(newState) {
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

    setFullyConnectedComponents((old) => {
      if (JSON.stringify(old) == JSON.stringify(fullyConnectedComponents)) return old;
      return fullyConnectedComponents;
    });
    setSchematicComponents((old) => {
      const next = { ...components };
      if (JSON.stringify(old) == JSON.stringify(next)) return old;
      return next;
    });
    setNodes((/*old*/) => {
      setResults({ ...emptyResults });
      return nodeMap;
    });

    setComponents(components);
    const tempNewComponent = {};
    for (const key in shapesWithLabels) tempNewComponent[key] = calculateNextLabel(components, key);
    setNextComponent(tempNewComponent);
  }

  const regenerateNodeMapsRef = useRef(regenerateNodeMaps);
  regenerateNodeMapsRef.current = regenerateNodeMaps;

  function trackHistory(newState) {
    setHistory((old_h) => {
      const deepCopyState = JSON.parse(JSON.stringify(newState));
      const h = { ...old_h };
      if (h.pointer < h.state.length - 1) h.state = h.state.slice(0, h.pointer + 1);
      if (h.state.length == numUndos) h.state = [...h.state.slice(1), deepCopyState];
      else h.state = [...h.state, deepCopyState];
      h.pointer = h.state.length - 1;
      return h;
    });
  }

  const trackHistoryRef = useRef(trackHistory);
  trackHistoryRef.current = trackHistory;
  const initialCanvasStateRef = useRef(history.state[0]);

  useEffect(() => {
    const newState = history.state[history.pointer];
    if (!newState) return;
    regenerateNodeMapsRef.current(newState);
  }, [history]);

  function undo() {
    setHistory((old_h) => {
      if (old_h.pointer == 0) return old_h;
      const instance = vjsRef.current;
      const nextState = old_h.state[old_h.pointer - 1];
      if (instance) instance.applyState(nextState, { source: "programmatic" });
      return { ...old_h, pointer: old_h.pointer - 1 };
    });
  }

  function redo() {
    setHistory((old_h) => {
      if (old_h.pointer >= old_h.state.length - 1) return old_h;
      const instance = vjsRef.current;
      const nextState = old_h.state[old_h.pointer + 1];
      if (instance) instance.applyState(nextState, { source: "programmatic" });
      return { ...old_h, pointer: old_h.pointer + 1 };
    });
  }

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  undoRef.current = undo;
  redoRef.current = redo;

  useEffect(() => {
    if (!schematicApiRef) return;
    schematicApiRef.current = {
      setShapeLabel(shapeId, rawText) {
        const h = historyRef.current;
        const base = h.state[h.pointer];
        if (!base) return;
        const newState = JSON.parse(JSON.stringify(base));
        const shape = newState.shapes[shapeId];
        if (!shape?.label) return;
        const shapeType = shape.image.split(".")[0];
        shape.label.text = commitLabelForType(shapeType, rawText, shapeId);
        const instance = vjsRef.current;
        if (!instance) return;
        instance.applyState(newState, { source: "user" });
      },
    };
    return () => {
      schematicApiRef.current = null;
    };
  }, [schematicApiRef, vjs]);

  useEffect(() => {
    const newVjs = visiojs({
      initialState: initialCanvasStateRef.current,
      stateChanged: (s) => trackHistoryRef.current(s),
    });
    setVjs(newVjs);
  }, []);

  useEffect(() => {
    if (vjs) vjs.init();
  }, [vjs]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
      const isRedo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey;

      if (isUndo) {
        e.preventDefault();
        undoRef.current();
      } else if (isRedo) {
        e.preventDefault();
        redoRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasVin = Object.values(oldComponents).some((c) => c.type === "vin");
  const hasIin = Object.values(oldComponents).some((c) => c.type === "iin");
  const allowedToAdd = {};
  allowedToAdd["vin"] = !hasVin && !hasIin;
  allowedToAdd["iin"] = !hasVin && !hasIin;
  allowedToAdd["vprobe"] = Object.values(oldComponents).filter((c) => c.type == "vprobe").length < 2;
  return (
    <Grid container spacing={1}>
      <Grid container size={{ xs: 12, sm: 10 }} columns={{ xs: 3, md: 9 }}>
        {Object.keys(addShapes).map((key) => {
          const shape = { ...addShapes[key] };
          if ("label" in shape) shape.label = { ...shape.label, text: nextComponent[key] };
          return (
            <Grid size={1} key={key}>
              <Tooltip
                key={key}
                title={
                  key == "vin" && !allowedToAdd["vin"]
                    ? "max 1 vin or iin "
                    : key == "iin" && !allowedToAdd["iin"]
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
                    disabled={key == "vin" ? !allowedToAdd["vin"] : key == "iin" ? !allowedToAdd["iin"] : key == "vprobe" ? !allowedToAdd["vprobe"] : false}
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
