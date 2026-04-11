// import { visiojs } from "/visiojs/package/dist/visiojs.js";
import visiojs from "visiojs";
import { useEffect, useState, useCallback, useRef } from "react";
import { createNodeMap } from "./visiojs_to_matrix.js";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";

import { addShapes, emptyResults } from "./common.js";
import { assignSympySymbols, ensureCircuitIds } from "./circuitIds.js";

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

/** Sources are not in componentValues; skip them when grouping by SymPy name. */
const NO_VALUE_SYNC_TYPES = new Set(["vin", "iin", "gnd"]);

const activeComponents = ["opamp", "resistor", "capacitor", "inductor", "vcvs", "vcis"];
const probes = ["vprobe", "iprobe"];

const initialLabels = {};
Object.keys(shapesWithLabels).forEach((key) => {
  initialLabels[key] = `${shapesWithLabels[key]}0`;
});

/**
 * visiojs `su()` only creates the label <text> when the shape group is new; for existing shapes
 * it updates transform but never refreshes label text. Patch the SVG from schematic state.
 */
function syncVisioLabelsFromSchematicState(state) {
  const root = document.querySelector("#visiojs_top");
  if (!root || !state?.shapes) return;
  state.shapes.forEach((shape, index) => {
    if (shape == null || !shape.label) return;
    const g = root.querySelector(`#shape_${index}`);
    const textEl = g?.querySelector("text.visiojs_label");
    if (textEl) {
      textEl.textContent = shape.label.text ?? "";
      if (shape.label.x != null) textEl.setAttribute("x", String(shape.label.x));
      if (shape.label.y != null) textEl.setAttribute("y", String(shape.label.y));
    }
  });
}

function calculateNextIndex(components, type, prefix) {
  if (!components || Object.keys(components).length === 0) return initialLabels[type];
  const sameType = Object.values(components).filter((c) => c.type === type);
  let maxN = -1;
  let matched = false;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}(\\d+)$`);
  for (const c of sameType) {
    const m = (c.displayName || "").match(re);
    if (m) {
      matched = true;
      maxN = Math.max(maxN, Number(m[1]));
    }
  }
  if (matched) return `${prefix}${maxN + 1}`;
  return `${prefix}${sameType.length === 0 ? 0 : sameType.length}`;
}

export function VisioJSSchematic({
  setResults,
  setNodes,
  setComponentValues,
  setFullyConnectedComponents,
  setSchematicComponents,
  history,
  setHistory,
  schematicSyncNonce = 0,
}) {
  const [nextComponent, setNextComponent] = useState(initialLabels);
  const [vjs, setVjs] = useState(null);
  const [oldComponents, setComponents] = useState({});

  const numUndos = 15;

  const regenerateNodeMaps = useCallback(
    (newState) => {
      const { nodeMap, components, fullyConnectedComponents } = createNodeMap(newState, addShapes);

      setComponentValues((oldValues) => {
        const newValues = { ...oldValues };
        // Add defaults for new parts; drop entries for deleted shapes.
        for (const [key, value] of Object.entries(components)) {
          if (!(key in newValues) && value.type in componentDefaults) newValues[key] = { type: value.type, ...componentDefaults[value.type] };
        }
        for (const key in newValues) {
          if (!(key in components)) delete newValues[key];
        }

        // If two parts share the same label + type (same SymPy symbol), keep one value/unit for both.
        // Use every schematic part in `components`, not only `fullyConnectedComponents` (vin subgraph).
        const symbolScratch = {};
        for (const [id, c] of Object.entries(components)) {
          if (NO_VALUE_SYNC_TYPES.has(c.type)) continue;
          symbolScratch[id] = { type: c.type, displayName: c.displayName };
        }
        assignSympySymbols(symbolScratch);

        const groupKey = (sym, type) => `${sym}\0${type}`;
        const idsBySymType = new Map();
        for (const [id, el] of Object.entries(symbolScratch)) {
          if (!el.sympySymbol) continue;
          const k = groupKey(el.sympySymbol, el.type);
          if (!idsBySymType.has(k)) idsBySymType.set(k, []);
          idsBySymType.get(k).push(id);
        }

        // Canonical = first shape on the canvas (array order) in each group, so an older part wins over a rename.
        const canonicalIdByGroup = new Map();
        for (const s of newState.shapes) {
          if (s == null || !("connectors" in s)) continue;
          const cid = s.circuitId;
          if (!cid || !symbolScratch[cid]?.sympySymbol) continue;
          const el = symbolScratch[cid];
          const k = groupKey(el.sympySymbol, el.type);
          if (canonicalIdByGroup.has(k)) continue;
          canonicalIdByGroup.set(k, cid);
        }

        for (const [k, ids] of idsBySymType) {
          if (ids.length < 2) continue;
          let canon = canonicalIdByGroup.get(k);
          if (canon == null || !(canon in newValues)) {
            canon = [...ids].sort().find((cid) => cid in newValues);
          }
          if (!canon) continue;
          const ref = newValues[canon];
          for (const id of ids) {
            if (id !== canon && id in newValues && newValues[id].type === ref.type) {
              newValues[id] = { ...newValues[id], value: ref.value, unit: ref.unit };
            }
          }
        }

        if (JSON.stringify(oldValues) == JSON.stringify(newValues)) return oldValues;
        return newValues;
      });

      setFullyConnectedComponents((old) => {
        if (JSON.stringify(old) == JSON.stringify(fullyConnectedComponents)) return old;
        return fullyConnectedComponents;
      });
      setSchematicComponents((old) => {
        if (JSON.stringify(old) == JSON.stringify(components)) return old;
        return components;
      });
      setNodes((/*old*/) => {
        setResults({ ...emptyResults });
        return nodeMap;
      });

      setComponents(components);
      const tempNewComponent = {};
      for (const key in shapesWithLabels) tempNewComponent[key] = calculateNextIndex(components, key, shapesWithLabels[key]);
      setNextComponent(tempNewComponent);
    },
    [setComponentValues, setFullyConnectedComponents, setSchematicComponents, setNodes, setResults],
  );

  const trackHistory = useCallback(
    (newState) => {
      const patched = ensureCircuitIds(JSON.parse(JSON.stringify(newState)));
      setHistory((old_h) => {
        const h = { ...old_h };
        if (h.pointer < h.state.length - 1) h.state = h.state.slice(0, h.pointer + 1);
        if (h.state.length == numUndos) h.state = [...h.state.slice(1), patched];
        else h.state = [...h.state, patched];
        h.pointer = h.state.length - 1;
        return h;
      });
    },
    [setHistory],
  );

  const lastSynced = useRef({ p: -1, sig: "" });
  const lastSchematicSyncNonce = useRef(-1);
  /** visiojs.redraw uses internals that only exist after init(); effects run in order so init must run in the same effect before redraw. */
  const vjsInitedRef = useRef(null);
  useEffect(() => {
    if (!vjs) {
      vjsInitedRef.current = null;
      return;
    }
    if (vjsInitedRef.current !== vjs) {
      vjs.init();
      vjsInitedRef.current = vjs;
    }
    const st = history.state[history.pointer];
    const sig = JSON.stringify(st);
    const forcedFromAdjuster = schematicSyncNonce !== lastSchematicSyncNonce.current;
    if (forcedFromAdjuster) lastSchematicSyncNonce.current = schematicSyncNonce;
    if (!forcedFromAdjuster && lastSynced.current.p === history.pointer && lastSynced.current.sig === sig) return;
    lastSynced.current = { p: history.pointer, sig };
    const stForVjs = JSON.parse(JSON.stringify(st));
    vjs.redraw(stForVjs);
    syncVisioLabelsFromSchematicState(stForVjs);
    requestAnimationFrame(() => syncVisioLabelsFromSchematicState(stForVjs));
    regenerateNodeMaps(stForVjs);
  }, [vjs, history.pointer, history.state, regenerateNodeMaps, schematicSyncNonce]);

  useEffect(() => {
    if (vjs) return;
    const st = ensureCircuitIds(JSON.parse(JSON.stringify(history.state[history.pointer])));
    const newVjs = visiojs({
      initialState: st,
      stateChanged: trackHistory,
    });
    setVjs(newVjs);
  }, [vjs, trackHistory, history.state, history.pointer]);

  const undo = useCallback(() => {
    setHistory((old_h) => {
      if (old_h.pointer == 0) return old_h;
      return { ...old_h, pointer: old_h.pointer - 1 };
    });
  }, [setHistory]);

  const redo = useCallback(() => {
    setHistory((old_h) => {
      if (old_h.pointer >= old_h.state.length - 1) return old_h;
      return { ...old_h, pointer: old_h.pointer + 1 };
    });
  }, [setHistory]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
      const isRedo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey;

      if (isUndo) {
        e.preventDefault();
        undo();
      } else if (isRedo) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const allowedToAdd = {};
  const compVals = Object.values(oldComponents);
  allowedToAdd["vin"] = !compVals.some((c) => c.type === "iin" || c.type === "vin");
  allowedToAdd["vprobe"] = compVals.filter((c) => c.type == "vprobe").length < 2;

  return (
    <Grid container spacing={1} sx={{ mt: 1 }}>
      <Grid container size={{ xs: 12, sm: 10 }} columns={{ xs: 3, md: 9 }}>
        {Object.keys(addShapes).map((key) => {
          const base = addShapes[key];
          const shape = JSON.parse(JSON.stringify(base));
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
                    onClick={() => vjs && vjs.addShape(shape)}
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
