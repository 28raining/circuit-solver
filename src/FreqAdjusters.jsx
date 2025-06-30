import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";

import { units } from "./common";

export function FreqAdjusters({ settings, setSettings }) {
  function handleValueChange(name, value) {
    setSettings((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
  }
  // function handleUnitChange (name, value) {
  //   setComponentValues((prevValues) => ({
  //     ...prevValues,
  //     [name]: { ...prevValues[name], unit: value }
  //   }));
  // };

  return (
    <Grid container spacing={2}>
      {[
        ["fmin", "fminUnit"],
        ["fmax", "fmaxUnit"],
        ["resolution", null],
      ].map((key) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key[0]}>
          <Card sx={{ p: 1, m: 1 }}>
            <Stack direction="row" spacing={0} alignItems="center" sx={{ borderRadius: 1 }}>
              <Typography variant="h5" sx={{ mr: 1 }}>
                {key[0]}
              </Typography>
              <TextField
                name={key[0]}
                value={settings[key[0]]}
                sx={{ width: "8ch" }}
                size="small"
                onChange={(e) => handleValueChange(key[0], e.target.value)}
                // fullWidth
              />
              {key[1] !== null && (
                <FormControl size="small">
                  <Select value={settings[key[1]]} onChange={(e) => handleValueChange(key[1], e.target.value)}>
                    {Object.keys(units["frequency"]).map((opt) => (
                      <MenuItem key={opt} value={opt} size="small">
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
