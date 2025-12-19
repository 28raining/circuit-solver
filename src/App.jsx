import { useEffect, useState, useRef } from "react";
import "./App.css";
import "visiojs/dist/visiojs.css"; // Import VisioJS styles
// import { startupSchematic } from "./startupSchematic.js";
import pako from "pako";
import "bootstrap/dist/css/bootstrap.min.css";
import { VisioJSSchematic } from "./VisioJSSchematic.jsx";
import { ComponentAdjuster } from "./ComponentAdjuster.jsx";
import { FreqAdjusters } from "./FreqAdjusters.jsx";
// import Grid from "@mui/material/Grid";
import { units, formatMathML } from "./common.js";
import { calcBilinear, new_calculate_tf } from "./new_solveMNA.js";

import { NavBar } from "./NavBar.jsx";
import { ChoseTF } from "./ChoseTF.jsx";
import { DisplayMathML } from "./DisplayMathML.jsx";
import Footer from "./Footer.jsx";
import ReleaseNotes from "./ReleaseNotes.jsx";

import { Comments } from "@hyvor/hyvor-talk-react";
import MyChart from "./PlotTF.jsx";
import Container from "@mui/material/Container";
import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";

const initialComponents = {
  L0: {
    type: "inductor",
    value: 1,
    unit: "uH",
  },
  R0: {
    type: "resistor",
    value: 10,
    unit: "KΩ",
  },
  C0: {
    type: "capacitor",
    value: 10,
    unit: "fF",
  },
};

const initialSettings = {
  fmin: 1,
  fminUnit: "MHz",
  fmax: 100,
  fmaxUnit: "GHz",
  resolution: 100,
};
import { initialSchematic } from "./initialSchematic.js";
var urlContainsState = false; // Flag to check if URL contains state

function stateFromURL() {
  const url = new URL(window.location.href);
  const componentsParam = url.searchParams.get("components");
  const settingsParam = url.searchParams.get("settings");
  const schematicParam = url.searchParams.get("schematic");

  var modifiedComponents = initialComponents;
  var modifiedSettings = initialSettings;
  var modifiedSchematic = initialSchematic; // Default to initial schematic if no URL param is

  if (componentsParam) {
    urlContainsState = true; // Set the flag if components are present in the URL
    modifiedComponents = componentsParam.split("__").reduce((acc, comp) => {
      const [key, type, value, unit] = comp.split("_");
      acc[key] = { type, value: parseFloat(value), unit };
      return acc;
    }, {});
    // setComponentValues(componentsArray);
  }
  if (settingsParam) {
    urlContainsState = true; // Set the flag if components are present in the URL

    modifiedSettings = settingsParam.split("__").reduce((acc, setting) => {
      const [key, value] = setting.split("_");
      acc[key] = isNaN(value) ? value : parseFloat(value);
      return acc;
    }, {});
  }
  if (schematicParam) {
    urlContainsState = true; // Set the flag if components are present in the URL

    // Decode the Base64 string back into a Uint8Array
    const compressedBinary = Uint8Array.from(atob(decodeURIComponent(schematicParam)), (char) => char.charCodeAt(0));
    const decompressed = pako.inflate(compressedBinary, { to: "string" }); // Decompress the data using pako
    modifiedSchematic = JSON.parse(decompressed); // Parse the decompressed JSON string into an object
  }
  return [modifiedComponents, modifiedSettings, modifiedSchematic];
}
const [modifiedComponents, modifiedSettings, modifiedSchematic] = stateFromURL();

function compToURL(key, value) {
  return `${key}_${value.type}_${value.value}_${value.unit}`;
}

function App() {
  const [nodes, setNodes] = useState([]);

  const [fullyConnectedComponents, setFullyConnectedComponents] = useState({});
  const [results, setResults] = useState({ text: "", mathML: "", complexResponse: "", solver: null, probeName: "", drivers: [] });
  const [numericResults, setNumericResults] = useState({ numericML: "", numericText: "" });
  const [bilinearResults, setBilinearResults] = useState({ bilinearML: "", bilinearText: "" });
  const [componentValues, setComponentValues] = useState(modifiedComponents);
  const [settings, setSettings] = useState(modifiedSettings);
  const [schemHistory, setSchemHistory] = useState({ pointer: 0, state: [modifiedSchematic] });
  const [urlSnackbar, setUrlSnackbar] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState(false);
  const [unsolveSnackbar, setUnsolveSnackbar] = useState(false);

  const handleSnackbarClick = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };

  //open the snackbar after 1 seconds if there is state in the URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (urlContainsState) {
        setUrlSnackbar(true);
      }
    }, 1000); // 1 seconds
    // Optional: Clean up the timer if the component unmounts early
    return () => clearTimeout(timer);
  }, []);

  function LetUserKnowAboutURL() {
    return (
      <Snackbar
        open={urlSnackbar}
        autoHideDuration={10000}
        onClose={() => setUrlSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        message="This Snackbar will be dismissed in 5 seconds."
      >
        <SnackbarContent
          message="Some settings were loaded from the URL. Please click here to reset to the default state."
          sx={{
            backgroundColor: "#2196f3",
            color: "#fff",
            cursor: "pointer", // Indicate clickable
            maxWidth: 200,
          }}
          onClick={handleSnackbarClick}
        />
      </Snackbar>
    );
  }

  function SnackbarError() {
    return (
      <Snackbar
        open={errorSnackbar}
        autoHideDuration={10000}
        onClose={() => setErrorSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        message="This Snackbar will be dismissed in 5 seconds."
      >
        <SnackbarContent
          message="An error has occurred. Please try using Sympy. If the issue persists please leave a comment"
          sx={{
            backgroundColor: "#ec1186ff",
            color: "#fff",
            maxWidth: 200,
          }}
        />
      </Snackbar>
    );
  }

  function SnackbarUnsolvable() {
    return (
      <Snackbar
        open={unsolveSnackbar}
        autoHideDuration={10000}
        onClose={() => setUnsolveSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        message="This Snackbar will be dismissed in 5 seconds."
      >
        <SnackbarContent
          message="The circuit seems to be unsolvable. Please double check your connections and try using Sympy if not already. Check the console for more details, and feel free to leave a comment."
          sx={{
            backgroundColor: "#ec1186ff",
            color: "#fff",
            maxWidth: 200,
          }}
        />
      </Snackbar>
    );
  }

  const componentValuesSolved = {};
  for (const key in componentValues) componentValuesSolved[key] = componentValues[key].value * units[componentValues[key].type][componentValues[key].unit];

  const [freq_new, setFreqNew] = useState(null);
  const [mag_new, setMagNew] = useState(null);
  const [phase_new, setPhaseNew] = useState(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timeout to debounce the calculation
    debounceTimerRef.current = setTimeout(async () => {
      const calculateTF = async () => {
        if (!results.solver || results.text === "") {
          setFreqNew([]);
          setMagNew([]);
          setPhaseNew([]);
          setNumericResults({ numericML: "", numericText: "" });
          setBilinearResults({ bilinearML: "", bilinearText: "" });
          return;
        }
        const fRange = { fmin: settings.fmin * units.frequency[settings.fminUnit], fmax: settings.fmax * units.frequency[settings.fmaxUnit] };
        const componentValuesSolved2 = {};
        for (const key in componentValues) componentValuesSolved2[key] = componentValues[key].value * units[componentValues[key].type][componentValues[key].unit];
        const { freq_new, mag_new, phase_new, numericML, numericText } = await new_calculate_tf(
          results.solver,
          fRange,
          settings.resolution,
          componentValuesSolved2,
          setErrorSnackbar,
        );
        setFreqNew(freq_new);
        setMagNew(mag_new);
        setPhaseNew(phase_new);
        if (numericML && numericText && results.probeName && results.drivers) {
          const formattedNumericML = formatMathML(numericML, results.probeName, results.drivers);
          setNumericResults({ numericML: formattedNumericML, numericText: numericText });
        }
      };
      calculateTF();
    }, 1000); // Wait 1000ms after the user stops typing

    // Cleanup function to clear timeout on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [results, settings, componentValues]);

  function stateToURL() {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "components",
      Object.keys(componentValues)
        .map((key) => compToURL(key, componentValues[key]))
        .join("__"),
    );
    url.searchParams.set(
      "settings",
      Object.keys(settings)
        .map((key) => `${key}_${settings[key]}`)
        .join("__"),
    );

    const jsonString = JSON.stringify(schemHistory.state[schemHistory.pointer]);
    const compressed = pako.deflate(jsonString, { to: "string" });
    // Encode the compressed data to make it URL-safe
    const encodedCompressed = encodeURIComponent(btoa(String.fromCharCode(...compressed)));
    // Use URLSearchParams to set the compressed data
    url.searchParams.set("schematic", encodedCompressed);

    window.history.pushState({}, "", url.toString()); // Update the browser URL without reloading
    return url.toString();
  }

  async function handleRequestBilin() {
    // console.log("handleRequestBilin", calcBilinear());
    const [raw, bilin] = await calcBilinear(results.solver);
    setBilinearResults({
      bilinearML: `<math>${bilin}</math>`,
      bilinearText: raw,
    });
  }
  // console.log(results);

  // Update the DOM
  return (
    <>
      <LetUserKnowAboutURL />
      <SnackbarError />
      <SnackbarUnsolvable />
      <NavBar stateToURL={stateToURL} />
      <div className="w-100 p-2 bg-green pb-5" key="wrapper">
        {/* <div className="container-xl" key="topContainer"> */}
        <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 } }}>
          <div className="row">
            <div className="col">
              <p className="my-0">
                This free online circuit solver tool can calculate the transfer function of circuits built from resistors, capacitors, inductors and op-amps. The user can quickly
                explore different topologies and find their Laplace transform
              </p>
            </div>
          </div>
          <div className="row shadow-sm rounded bg-lightgreen my-2 py-0" id="schematic">
            <div className="col-12">
              <VisioJSSchematic
                setResults={setResults}
                setNodes={setNodes}
                history={schemHistory}
                setHistory={setSchemHistory}
                setComponentValues={setComponentValues}
                setFullyConnectedComponents={setFullyConnectedComponents}
              />
            </div>
            <div className="col-12">
              <ComponentAdjuster componentValues={componentValues} setComponentValues={setComponentValues} />
            </div>
          </div>
          <div className="row shadow-sm rounded bg-lightgreen my-2 py-3" id="schematic">
            <ChoseTF
              setResults={setResults}
              nodes={nodes}
              fullyConnectedComponents={fullyConnectedComponents}
              componentValuesSolved={componentValuesSolved}
              setUnsolveSnackbar={setUnsolveSnackbar}
            />
            {results.text != "" && (
              <>
                <DisplayMathML title="Laplace Transform" textResult={results.text} mathML={results.mathML} caclDone={results.text != ""} />
                <div className="col-12">
                  <MyChart freq_new={freq_new} mag_new={mag_new} phase_new={phase_new} hasResults={results.text !== ""} />
                </div>
                <FreqAdjusters settings={settings} setSettings={setSettings} />
                <DisplayMathML title="Laplace Transform (numeric)" textResult={numericResults.numericText} mathML={numericResults.numericML} caclDone={results.text != ""} />

                {bilinearResults.bilinearML == "" ? (
                  <Grid container spacing={1}>
                    <Button
                      variant="contained"
                      color="info"
                      sx={{ m: 3 }}
                      onClick={async () => {
                        handleRequestBilin();
                      }}
                    >
                      Calculate bilinear transform
                    </Button>
                  </Grid>
                ) : (
                  <DisplayMathML title="Bilinear Transform" textResult={bilinearResults.bilinearText} mathML={bilinearResults.bilinearML} caclDone={results.text != ""} />
                )}
              </>
            )}
          </div>
          <div key="releaseNotes" className="row my-2 py-1">
            <ReleaseNotes />
          </div>
          <div key="comments" className="row my-2 py-1 shadow-sm rounded bg-lightgreen">
            {!import.meta.env.DEV && <Comments website-id="12350" page-id="7" />}
          </div>
        </Container>
      </div>
      <Footer />
    </>
  );
}

export default App;
