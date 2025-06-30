import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";

import SnackbarContent from "@mui/material/SnackbarContent";
import { ThemeProvider } from "@mui/material/styles";

import { theme } from "./common.js"; // import your theme file

import CircuitSolverSVG from "./assets/circuit-solver-icon.svg"; // import your SVG file
// import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from "@mui/icons-material/Save";
import HomeIcon from "@mui/icons-material/Home";

export function NavBar({ stateToURL }) {
  const [urlSnackbar, setUrlSnackbar] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <Snackbar
        open={urlSnackbar}
        autoHideDuration={10000}
        onClose={() => setUrlSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        message="This Snackbar will be dismissed in 5 seconds."
      >
        <SnackbarContent
          message="Shareable URL copied to clipboard! Your whole website state is in the URL"
          sx={{
            backgroundColor: "#2196f3",
            color: "#fff",
            cursor: "pointer", // Indicate clickable
            maxWidth: 200,
          }}
        />
      </Snackbar>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" sx={{ backgroundColor: "rgb(37, 50, 64)", py: 1 }}>
          <Toolbar style={{ minHeight: 0 }}>
            <img src={CircuitSolverSVG} alt="Smith Chart" width="30" height="30" style={{ marginRight: "12px" }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: "bold", display: { xs: "none", sm: "block" } }}>
              ONLINE CIRCUIT SOLVER
            </Typography>
            <div style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
              <Tooltip title="Copy shareable URL" placement="bottom">
                <IconButton
                  aria-label="download"
                  color="bland"
                  //on user click then copy url to clipboard
                  onClick={() => {
                    const url = stateToURL();
                    // const url = window.location.href;
                    navigator.clipboard.writeText(url).then(() => {
                      setUrlSnackbar(true);
                    });
                  }}
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
            </div>

            <Stack spacing={1} direction={{ sm: "column", xs: "column", md: "row" }}>
              <Button variant="contained" color="bland" component="a" href="https://www.will-kelsey.com">
                <HomeIcon />
              </Button>
              <Button variant="contained" color="bland" component="a" href="https://onlinesmithchart.com">
                Smith Chart
              </Button>
              <Button variant="contained" color="bland" component="a" href="https://www.will-kelsey.com/circuitSolver">
                Circuit Solver
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>
      </Box>
    </ThemeProvider>
  );
}

// export default NavBar;
