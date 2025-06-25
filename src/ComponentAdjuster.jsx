import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from '@mui/material/FormControl';


import { units } from "./common";

export function ComponentAdjuster({ componentValues, setComponentValues }) {
  function handleValueChange (name, value) {
    setComponentValues((prevValues) => ({
      ...prevValues,
      [name]: { ...prevValues[name], value: value }
    }));
  };
  function handleUnitChange (name, value) {
    setComponentValues((prevValues) => ({
      ...prevValues,
      [name]: { ...prevValues[name], unit: value }
    }));
  };

  return (
    <Grid container spacing={2}>
      {Object.keys(componentValues).map((key) => (
        <Grid item xs={12} sm={6} md={4} key={key}>
          <Card sx={{ p:1, m:1, width:"100%" }}>
              <Stack direction="row" spacing={0} alignItems="center" sx={{ borderRadius: 1 }}>
                <Typography variant="h5" sx={{ mr: 1 }}>
                  {key}
                </Typography>
                <TextField
                  name={key}
                  value={componentValues[key].value}
                  sx={{ width: "8ch" }}
                  size="small"
                  onChange={(e)=>handleValueChange(key, e.target.value)}
                  // fullWidth
                />
                <FormControl size="small">
                <Select
                value={componentValues[key].unit}
                onChange={(e) => handleUnitChange(key, e.target.value)}
                >
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
