import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
// import ToggleButton from "@mui/material/ToggleButton";
// import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Box from "@mui/material/Box";
import { useState } from "react";
import { build_and_solve_mna, calcBilinear } from "./new_solveMNA.js";


export function ChoseTF({ textResult, setTextResult, setMathML, setComplexResponse, nodes, addShapes, fullyConnectedComponents, componentValuesSolved }) {
  const [algebraic, setAlgebraic] = useState("algebraic");
  const probes = [];
  const drivers = [];
  for (const c in fullyConnectedComponents) if (["vin", "iin"].includes(fullyConnectedComponents[c].type)) drivers.push(fullyConnectedComponents[c].type);
  for (const c in fullyConnectedComponents) if (["vprobe", "iprobe"].includes(fullyConnectedComponents[c].type)) probes.push(c);
  console.log("probes", probes, fullyConnectedComponents);
  //if there's 2 vprobes, add P1-P0 and P0-P1 to the probes object
  const vprobes = probes.filter((p) => fullyConnectedComponents[p].type == "vprobe");
  if (vprobes.length == 2) {
    probes.push(`${vprobes[0]}-${vprobes[1]}`);
    probes.push(`${vprobes[1]}-${vprobes[0]}`);
  }

  //add a value field based on if user chose algebraic or numeric
  for (const c in fullyConnectedComponents) {
    if (algebraic == "numeric" && c in componentValuesSolved) fullyConnectedComponents[c].value = componentValuesSolved[c];
    else fullyConnectedComponents[c].value = c;
  }
  console.log("componentValuesSolved", componentValuesSolved, fullyConnectedComponents, algebraic);
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", my: 1 }}>
      {drivers.length == 0 || probes.length == 0 ? (
        <Box sx={{ color: "red" }}>
          <p>
            No path found from <b>vin</b> or <b>iin</b> to <b>vprobe</b> or <b>iprobe</b>
          </p>
        </Box>
      ) : (
        <Box display="flex" gap={1}>
          <Stack spacing={2} direction="row" sx={{ alignItems: "center" }}>
            <p>Calculate...</p>
            {probes.map((p) => {
              const int_probes = p.includes("-") ? p.split("-") : [p];

              return (
                <Button
                  key={p}
                  variant="contained"
                  color="info"
                  sx={{ py: 1, justifyContent: "center", fontSize: "1.4em" }}
                  onClick={() => {
                    const [textResult, mathml, complex_response] = build_and_solve_mna(nodes, addShapes, int_probes, fullyConnectedComponents);
                    const editedMathMl = `<math><mfrac><mrow><mi>${p}</mi></mrow><mrow><msub><mi>${drivers[0] == "vin" ? "V" : "I"}</mi><mi>in</mi></msub></mrow></mfrac><mo>=</mo>${mathml}</math>`;
                    setTextResult(textResult);
                    setMathML(editedMathMl);
                    setComplexResponse(complex_response);
                  }}
                >
                  <Stack spacing={2} direction="row">
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
                  </Stack>
                </Button>
              );
            })}
          </Stack>
        </Box>
      )}
      {/* Enable this feature if this ticket gets solved! https://github.com/Yaffle/Expression/issues/15 */}
      {/* <Box display="flex" gap={1}>
        <ToggleButtonGroup color="primary" value={algebraic} exclusive onChange={() => setAlgebraic(algebraic == "algebraic" ? "numeric" : "algebraic")}>
          <ToggleButton value="algebraic">Algebraic</ToggleButton>
          <ToggleButton value="numeric">Numeric</ToggleButton>
        </ToggleButtonGroup>
      </Box> */}
    </Box>
  );
}
