import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { useState, useEffect } from "react";
import { build_and_solve_mna } from "./new_solveMNA.js";
import CircularProgress from "@mui/material/CircularProgress";
import { initPyodideAndSympy } from "./pyodideLoader";
import { emptyResults, formatMathML } from "./common.js"; // Import the emptyResults object

/** UUIDs contain "-"; differential probes must not use "-" as the pair delimiter. */
export const PROBE_PAIR_DELIM = "::";

function probeDisplayLabel(p, fcc, schematicComponents) {
  if (p.includes(PROBE_PAIR_DELIM)) {
    const [a, b] = p.split(PROBE_PAIR_DELIM);
    const la = fcc[a]?.displayName ?? schematicComponents?.[a]?.displayName ?? a;
    const lb = fcc[b]?.displayName ?? schematicComponents?.[b]?.displayName ?? b;
    return `${la}-${lb}`;
  }
  return fcc[p]?.displayName ?? schematicComponents?.[p]?.displayName ?? p;
}

export function ChoseTF({ setResults, nodes, fullyConnectedComponents, schematicComponents, componentValuesSolved, setUnsolveSnackbar }) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [loadedPyo, setLoadedPyo] = useState(null);

  // Auto-initialize Pyodide on component mount
  useEffect(() => {
    let isMounted = true;
    const initializePyodide = async () => {
      setLoading(true);
      try {
        const pyodide = await initPyodideAndSympy();
        if (isMounted) {
          setLoadedPyo(pyodide);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize Pyodide:", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    initializePyodide();
    return () => {
      isMounted = false;
    };
  }, []);
  const probes = [];
  const drivers = [];
  for (const c in fullyConnectedComponents) if (["vin", "iin"].includes(fullyConnectedComponents[c].type)) drivers.push(fullyConnectedComponents[c].type);
  for (const c in fullyConnectedComponents) if (["vprobe", "iprobe"].includes(fullyConnectedComponents[c].type)) probes.push(c);
  // console.log("probes", probes, fullyConnectedComponents);
  //if there's 2 vprobes, add P1-P0 and P0-P1 to the probes object
  const vprobes = probes.filter((p) => fullyConnectedComponents[p].type == "vprobe");
  if (vprobes.length == 2) {
    probes.push(`${vprobes[0]}${PROBE_PAIR_DELIM}${vprobes[1]}`);
    probes.push(`${vprobes[1]}${PROBE_PAIR_DELIM}${vprobes[0]}`);
  }

  return (
    <Grid container spacing={1} sx={{ mt: 1 }}>
      {drivers.length == 0 || probes.length == 0 ? (
        <Box sx={{ color: "red" }}>
          <p>
            No path found from <b>vin</b> or <b>iin</b> to <b>vprobe</b> or <b>iprobe</b>
          </p>
        </Box>
      ) : (
        <>
          <Grid size={12}>Calculate...</Grid>

          {probes.map((p) => {
            const int_probes = p.includes(PROBE_PAIR_DELIM) ? p.split(PROBE_PAIR_DELIM) : [p];

            return (
              <Grid size={{ xs: 4, sm: 2, lg: 1 }} key={p}>
                <Button
                  key={p}
                  variant="contained"
                  disabled={loading || !loadedPyo || calculating}
                  color="info"
                  fullWidth
                  sx={{ py: 1, justifyContent: "center", fontSize: "1.4em" }}
                  onClick={async () => {
                    setCalculating(true);
                    setResults({ ...emptyResults }); // Reset results to empty
                    //this console log is for collecting data for testing
                    // console.log(nodes.length, int_probes, fullyConnectedComponents, valueForAlgebra, loadedPyo);
                    const [textResult, mathml] = await build_and_solve_mna(nodes.length, int_probes, fullyConnectedComponents, componentValuesSolved, loadedPyo);
                    if (textResult === "" && mathml === "") {
                      setUnsolveSnackbar((x) => {
                        if (!x) return true;
                        else return x;
                      });
                    }
                    const editedMathMl = formatMathML(mathml, probeDisplayLabel(p, fullyConnectedComponents, schematicComponents), drivers);
                    setResults({
                      text: textResult,
                      mathML: editedMathMl,
                      complexResponse: "",
                      solver: loadedPyo,
                      probeName: p,
                      probeDisplayLabel: probeDisplayLabel(p, fullyConnectedComponents, schematicComponents),
                      drivers: drivers,
                    });
                    setCalculating(false);
                    // setTextResult(textResult);
                    // setMathML(editedMathMl);
                    // setComplexResponse(complex_response);
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <math xmlns="http://www.w3.org/1998/Math/MathML">
                      <mfrac>
                        <mi>{probeDisplayLabel(p, fullyConnectedComponents, schematicComponents)}</mi>
                        {drivers[0] == "vin" ? (
                          <msub>
                            <mi>V</mi>
                            <mi>in</mi>
                          </msub>
                        ) : (
                          <msub>
                            <mi>I</mi>
                            <mi>in</mi>
                          </msub>
                        )}
                      </mfrac>
                    </math>
                  )}
                </Button>
              </Grid>
            );
          })}
        </>
      )}
    </Grid>
  );
}
