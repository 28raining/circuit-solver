import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";

import { units } from "./common";

export function ComponentAdjuster({ componentValues, setComponentValues, fullyConnectedComponents, schematicComponents, onDisplayNameChange }) {
  function handleValueChange(id, value) {
    setComponentValues((prevValues) => {
      const sym = fullyConnectedComponents[id]?.sympySymbol;
      const t = prevValues[id]?.type;
      const next = { ...prevValues, [id]: { ...prevValues[id], value } };
      if (sym && t) {
        for (const k of Object.keys(next)) {
          if (k !== id && fullyConnectedComponents[k]?.sympySymbol === sym && fullyConnectedComponents[k]?.type === t) {
            next[k] = { ...next[k], value };
          }
        }
      }
      return next;
    });
  }
  function handleUnitChange(id, value) {
    setComponentValues((prevValues) => {
      const sym = fullyConnectedComponents[id]?.sympySymbol;
      const t = prevValues[id]?.type;
      const next = { ...prevValues, [id]: { ...prevValues[id], unit: value } };
      if (sym && t) {
        for (const k of Object.keys(next)) {
          if (k !== id && fullyConnectedComponents[k]?.sympySymbol === sym && fullyConnectedComponents[k]?.type === t) {
            next[k] = { ...next[k], unit: value };
          }
        }
      }
      return next;
    });
  }

  function handleDisplayNameInput(id, text) {
    onDisplayNameChange(id, text);
  }

  return (
    <Grid container spacing={2}>
      {Object.keys(componentValues).map((key) => (
        <Grid size={{ md: 3 }} key={key}>
          <Card sx={{ p: 1, m: 1, width: "100%" }}>
            <Stack direction="row" spacing={0} alignItems="center" sx={{ borderRadius: 1 }} flexWrap="wrap" useFlexGap>
              <TextField
                label="Name"
                value={fullyConnectedComponents[key]?.displayName ?? schematicComponents[key]?.displayName ?? ""}
                sx={{ width: "10ch", mr: 1, mb: 0.5 }}
                size="small"
                onChange={(e) => handleDisplayNameInput(key, e.target.value)}
              />
              <TextField name={key} value={componentValues[key].value} sx={{ width: "8ch" }} size="small" onChange={(e) => handleValueChange(key, e.target.value)} />
              <FormControl size="small">
                <Select value={componentValues[key].unit} onChange={(e) => handleUnitChange(key, e.target.value)}>
                  {Object.keys(units[componentValues[key].type]).map((opt) => (
                    <MenuItem key={opt} value={opt} size="small">
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
