import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
// import ToggleButton from "@mui/material/ToggleButton";
// import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
// import { useState } from "react";
import { build_and_solve_mna } from "./new_solveMNA.js";

export function ChoseTF({ setResults, nodes, fullyConnectedComponents, componentValuesSolved }) {
  // const [algebraic, setAlgebraic] = useState("algebraic");
  const algebraic = "algebraic";
  const probes = [];
  const drivers = [];
  for (const c in fullyConnectedComponents) if (["vin", "iin"].includes(fullyConnectedComponents[c].type)) drivers.push(fullyConnectedComponents[c].type);
  for (const c in fullyConnectedComponents) if (["vprobe", "iprobe"].includes(fullyConnectedComponents[c].type)) probes.push(c);
  // console.log("probes", probes, fullyConnectedComponents);
  //if there's 2 vprobes, add P1-P0 and P0-P1 to the probes object
  const vprobes = probes.filter((p) => fullyConnectedComponents[p].type == "vprobe");
  if (vprobes.length == 2) {
    probes.push(`${vprobes[0]}-${vprobes[1]}`);
    probes.push(`${vprobes[1]}-${vprobes[0]}`);
  }

  // add a value field based on if user chose algebraic or numeric
  const valueForAlgebra = {};
  for (const c in fullyConnectedComponents) {
    if (algebraic == "numeric" && c in componentValuesSolved) valueForAlgebra[c] = componentValuesSolved[c];
    else valueForAlgebra[c] = c;
  }
  // console.log("componentValuesSolved", componentValuesSolved, fullyConnectedComponents, algebraic);
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
            const int_probes = p.includes("-") ? p.split("-") : [p];

            return (
              <Grid size={{ xs: 4, sm: 2, lg: 1 }} key={p}>
                <Button
                  key={p}
                  variant="contained"
                  color="info"
                  fullWidth
                  sx={{ py: 1, justifyContent: "center", fontSize: "1.4em" }}
                  onClick={() => {
                    const [textResult, mathml, complex_response] = build_and_solve_mna(nodes.length, int_probes, fullyConnectedComponents, valueForAlgebra);
                    const editedMathMl = `<math><mfrac><mrow><mi>${p}</mi></mrow><mrow><msub><mi>${
                      drivers[0] == "vin" ? "V" : "I"
                    }</mi><mi>in</mi></msub></mrow></mfrac><mo>=</mo>${mathml}</math>`;
                    setResults({text: textResult, mathML: editedMathMl, complexResponse: complex_response, bilinearRaw: "", bilinearMathML: "" });
                    // setTextResult(textResult);
                    // setMathML(editedMathMl);
                    // setComplexResponse(complex_response);
                  }}
                >
                  <math xmlns="http://www.w3.org/1998/Math/MathML">
                    <mfrac>
                      <mi>{p}</mi>
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
                </Button>
              </Grid>
            );
          })}
        </>
      )}
      {/* Enable this feature if this ticket gets solved! https://github.com/Yaffle/Expression/issues/15 */}
      {/* <Box display="flex" gap={1}>
        <ToggleButtonGroup color="primary" value={algebraic} exclusive onChange={() => setAlgebraic(algebraic == "algebraic" ? "numeric" : "algebraic")}>
          <ToggleButton value="algebraic">Algebraic</ToggleButton>
          <ToggleButton value="numeric">Numeric</ToggleButton>
        </ToggleButtonGroup>
      </Box> */}
    </Grid>
  );
}
