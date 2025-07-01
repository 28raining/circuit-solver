import { useEffect, useState } from "react";
import "./App.css";
import "visiojs/dist/visiojs.css"; // Import VisioJS styles
// import { startupSchematic } from "./startupSchematic.js";
import pako from "pako";
import "bootstrap/dist/css/bootstrap.min.css";
import { VisioJSSchematic } from "./VisioJSSchematic.jsx";
import { ComponentAdjuster } from "./ComponentAdjuster.jsx";
import { FreqAdjusters } from "./FreqAdjusters.jsx";
// import Grid from "@mui/material/Grid";
import { units } from "./common.js";
import { calcBilinear } from "./new_solveMNA.js";

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

function new_calculate_tf(textResult, fRange, numSteps, components) {
  // console.log("new_calculate_tf", { textResult, fRange, numSteps, components });
  if (textResult == "") return { freq_new: [], mag_new: [] };
  var complex_freq = textResult;
  var rep;
  for (const key in components) {
    rep = RegExp(key, "g");
    complex_freq = complex_freq.replace(rep, components[key]);
  }

  //Now only remaining variable is S, substitute that and solve. Also swap power ^ for **
  const re = /s/gi;
  const re2 = /\^/gi;
  const re3 = /abs/gi; //sometimes abs(C0) is left in the equation
  var res = complex_freq.replace(re2, "**");
  res = res.replace(re3, "");

  var fstepdB_20 = Math.log10(fRange.fmax / fRange.fmin) / numSteps;
  var fstep = 10 ** fstepdB_20;
  var absNew, evalNew;
  const freq = [];
  const mag = [];
  try {
    for (var f = fRange.fmin; f < fRange.fmax; f = f * fstep) {
      freq.push(f);
      // const mathString = res.replace(re, 2 * Math.PI * f).replace(/\*\*/g, "^");
      // evalNew = evaluate(mathString);
      const mathString = res.replace(re, 2 * Math.PI * f);
      evalNew = eval(mathString);

      absNew = Math.abs(evalNew);
      mag.push(20 * Math.log10(absNew));
    }
  } catch (err) {
    // copiedToastError.show() //FIXME - re add this
    console.log("oh no", err);
  }

  return { freq_new: freq, mag_new: mag };
}

function compToURL(key, value) {
  return `${key}_${value.type}_${value.value}_${value.unit}`;
}

function App() {
  const [nodes, setNodes] = useState([]);

  const [fullyConnectedComponents, setFullyConnectedComponents] = useState({});
  const [results, setResults] = useState({ text: "", mathML: "", complexResponse: "", bilinearRaw: "", bilinearMathML: "" });
  const [componentValues, setComponentValues] = useState(modifiedComponents);
  const [settings, setSettings] = useState(modifiedSettings);
  const [schemHistory, setSchemHistory] = useState({ pointer: 0, state: [modifiedSchematic] });
  const [urlSnackbar, setUrlSnackbar] = useState(false);

  const handleSnackbarClick = () => {
    // setComponentValues({ ...initialComponents });
    // setSettings({ ...initialSettings });
    // setSchemHistory({pointer: 0, state: []});
    // setUrlSnackbar(false);
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

  const fRange = { fmin: settings.fmin * units.frequency[settings.fminUnit], fmax: settings.fmax * units.frequency[settings.fmaxUnit] };

  const componentValuesSolved = {};
  for (const key in componentValues) componentValuesSolved[key] = componentValues[key].value * units[componentValues[key].type][componentValues[key].unit];

  const { freq_new, mag_new } = new_calculate_tf(results.complexResponse, fRange, settings.resolution, componentValuesSolved);

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

  function handleRequestBilin() {
    // console.log("handleRequestBilin", calcBilinear());
    const [raw, bilin] = calcBilinear();
    // setBilinearMathML(`<math>${bilin}</math>`);
    // setBilinearRaw(raw);
    setResults({ ...results, bilinearRaw: raw, bilinearMathML: `<math>${bilin}</math>` });
  }
  // console.log("render");

  // Update the DOM
  return (
    <>
      <LetUserKnowAboutURL />
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
            />
            {results.text != "" && (
              <>
                <DisplayMathML title="Laplace" textResult={results.text} mathML={results.mathML} caclDone={results.text != ""} />
                <div className="col-12">
                  <MyChart freq_new={freq_new} mag_new={mag_new} />
                </div>
                <FreqAdjusters settings={settings} setSettings={setSettings} />
                <DisplayMathML
                  title="Bilinear"
                  textResult={results.bilinearRaw}
                  mathML={results.bilinearMathML}
                  handleRequestBilin={() => handleRequestBilin()}
                  caclDone={results.text != ""}
                />
              </>
            )}
          </div>
          <div key="releaseNotes" className="row my-2 py-1 shadow-sm rounded bg-lightgreen">
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
