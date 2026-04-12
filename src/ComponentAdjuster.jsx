import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";

import { useEffect, useState } from "react";
import { units } from "./common";
import { sympyNameGroupsForValueTypes, isCanonicalValueRow } from "./sympyValues.js";

function LabelField({ shapeId, sympyName, onCommit }) {
  const [val, setVal] = useState(sympyName);
  useEffect(() => {
    setVal(sympyName);
  }, [sympyName]);

  return <TextField label="Name" value={val} size="small" sx={{ minWidth: "10ch" }} onChange={(e) => setVal(e.target.value)} onBlur={() => onCommit(shapeId, val)} />;
}

export function ComponentAdjuster({ componentValues, setComponentValues, schematicComponents, schematicRef }) {
  const groups = sympyNameGroupsForValueTypes(schematicComponents);

  function handleValueChange(name, value) {
    setComponentValues((prevValues) => ({
      ...prevValues,
      [name]: { ...prevValues[name], value: value },
    }));
  }
  function handleUnitChange(name, value) {
    setComponentValues((prevValues) => ({
      ...prevValues,
      [name]: { ...prevValues[name], unit: value },
    }));
  }

  function commitLabel(shapeId, raw) {
    schematicRef?.current?.setShapeLabel(shapeId, raw);
  }

  const sortedIds = Object.keys(componentValues).sort((a, b) => Number(a) - Number(b));

  return (
    <Grid container spacing={2}>
      {sortedIds.map((key) => {
        const el = schematicComponents[key];
        const sympyName = el?.sympyName ?? "";
        const showValue = isCanonicalValueRow(key, schematicComponents, groups);
        const dupList = el ? groups[el.sympyName] : null;
        const sharedHint = dupList && dupList.length > 1 && !showValue;

        return (
          <Grid size={{ md: 3 }} key={key}>
            <Card sx={{ p: 1, m: 1, width: "100%" }}>

              <Stack direction="row" spacing={0} alignItems="center">
                <LabelField shapeId={Number(key)} sympyName={sympyName} onCommit={commitLabel} />

                {sharedHint ? (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Same symbol as {el.sympyName}; value is set there.
                  </Typography>
                ) : null}
                {showValue ? (<>
                  <TextField
                    name={key}
                    value={componentValues[key].value}
                    sx={{ width: "8ch" }}
                    size="small"
                    onChange={(e) => handleValueChange(key, e.target.value)}
                  // fullWidth
                  />
                  <FormControl size="small">
                    <Select value={componentValues[key].unit} onChange={(e) => handleUnitChange(key, e.target.value)}>
                      {Object.keys(units[componentValues[key].type]).map((opt) => (
                        <MenuItem key={opt} value={opt} size="small">
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>) : null}
              </Stack>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
