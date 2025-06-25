import { useState } from "react";
import "./App.css";
import { startupSchematic } from "./startupSchematic.js";
import pako from "pako";
import "bootstrap/dist/css/bootstrap.min.css";
import { VisioJSSchematic } from "./VisioJSSchematic.jsx";
import { ComponentAdjuster } from "./ComponentAdjuster.jsx";
import { FreqAdjusters } from "./FreqAdjusters.jsx";
// import Grid from "@mui/material/Grid";
import { units } from "./common.js";
import { calcBilinear } from "./new_solveMNA.js";
import { addShapes } from "./common.js";

import { NavBar } from "./NavBar.jsx";
import { ChoseTF } from "./ChoseTF.jsx";
import { DisplayMathML } from "./DisplayMathML.jsx";

import { Comments } from "@hyvor/hyvor-talk-react";
import MyChart from "./PlotTF.jsx"


// import React from "https://unpkg.com/es-react@16.13.1/dev/react.js";
// import ReactDOM from "https://unpkg.com/es-react@16.13.1/dev/react-dom.js";
// import React from "https://unpkg.com/es-react@16.13.1/react.js";
// import ReactDOM from "https://unpkg.com/es-react@16.13.1/react-dom.js";

//RESET IT ERROR OCCURS!
// window.onerror = function (message, file, line, col, error) {
// alert("The web page has crashed! Damn. If you can please describe what happened in a comment...\n\n" + error.message);
// window.location.href = location.protocol + '//' + location.host + location.pathname;
// };

// const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

//Decode the URL before starting and REACT stuff
// Extract the query parameter

var initialState = {
  elements: {
    L0: {
      value: 1,
      unit: "u",
      displayName: "L0",
    },
    R0: {
      value: 10,
      unit: "K",
      displayName: "R0",
    },
    C0: {
      value: 10,
      unit: "f",
      displayName: "C0",
    },
  },
  fmin: {
    value: 1,
    unit: "M",
  },
  fmax: {
    value: 100,
    unit: "G",
  },
  numSteps: 100,
  schematic: startupSchematic,
};
var startState = { ...initialState };

const urlParams = new URLSearchParams(window.location.search);
const encodedCompressed = urlParams.get("state");
if (encodedCompressed) {
  // Decode the Base64 string back into a Uint8Array
  const compressedBinary = Uint8Array.from(atob(decodeURIComponent(encodedCompressed)), (char) => char.charCodeAt(0));
  const decompressed = pako.inflate(compressedBinary, { to: "string" }); // Decompress the data using pako
  const decodedObject = JSON.parse(decompressed); // Parse the decompressed JSON string into an object

  if ("schematic" in decodedObject) startState.schematic = decodedObject.schematic;
  if ("elements" in decodedObject) startState.elements = decodedObject.elements;
  if ("fmin" in decodedObject) startState.fmin = decodedObject.fmin;
  if ("fmax" in decodedObject) startState.fmax = decodedObject.fmax;
  if ("numSteps" in decodedObject) startState.numSteps = decodedObject.numSteps;
}


function new_calculate_tf(textResult, fRange, numSteps, components) {
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

const initialComponents = {
    "L0": {
        "type": "inductor",
        "value": 1,
        "unit": "μH"
    },
    "R0": {
        "type": "resistor",
        "value": 10,
        "unit": "KΩ"
    },
    "C0": {
        "type": "capacitor",
        "value": 10,
        "unit": "fF"
    }
}

function App() {
  const [nodes, setNodes] = useState([]);

  const [textResult, setTextResult] = useState("");
  const [fullyConnectedComponents, setFullyConnectedComponents] = useState({});
  const [mathML, setMathML] = useState("");
  const [complexResponse, setComplexResponse] = useState("");
  const [components, setComponents] = useState({});
  const [componentValues, setComponentValues] = useState(initialComponents);
  const [bilinearMathML, setBilinearMathML] = useState("");
  const [bilinearRaw, setBilinearRaw] = useState("");
  const [settings, setSettings] = useState({
    fmin: 1,
    fmin_unit: "MHz",
    fmax: 100,
    fmax_unit: "GHz",
    resolution: 100,
  });
  const fRange = { fmin: settings.fmin * units.frequency[settings.fmin_unit], fmax: settings.fmax * units.frequency[settings.fmax_unit] };

  const componentValuesSolved = {};
  for (const key in componentValues) componentValuesSolved[key] = componentValues[key].value * units[componentValues[key].type][componentValues[key].unit];

  const { freq_new, mag_new } = new_calculate_tf(complexResponse, fRange, settings.resolution, componentValuesSolved);

  function handleRequestBilin() {
    console.log("handleRequestBilin", calcBilinear());
    const [raw, bilin] = calcBilinear();
    setBilinearMathML(`<math>${bilin}</math>`);
    setBilinearRaw(raw);
  }

  // Update the DOM
  return <>
    <NavBar />
    <div className="w-100 p-2 bg-green" key="wrapper">
      <div className="container-xl" key="topContainer">
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
              setTextResult={setTextResult}
              setNodes={setNodes}
              setComponents={setComponents}
              oldComponents={components}
              setComponentValues={setComponentValues}
              setFullyConnectedComponents={setFullyConnectedComponents}
            />
          </div>
          <div className="col-12">
            <ComponentAdjuster componentValues={componentValues} setComponentValues={setComponentValues} />
          </div>
        </div>
        <div className="row shadow-sm rounded bg-lightgreen my-2 py-2" id="schematic">
          <ChoseTF
            textResult={textResult}
            setTextResult={setTextResult}
            setMathML={setMathML}
            setComplexResponse={setComplexResponse}
            nodes={nodes}
            addShapes={addShapes}
            fullyConnectedComponents={fullyConnectedComponents}
            componentValuesSolved={componentValuesSolved}
          />
          {textResult!="" && <>
          <DisplayMathML textResult={textResult} laplace={mathML} bilinear={bilinearMathML} bilinearRaw={bilinearRaw} handleRequestBilin={() => handleRequestBilin()} />
          <div className="col-12">
            <MyChart freq_new={freq_new} mag_new={mag_new} />
          </div>
          <div className="col-12">
            <FreqAdjusters settings={settings} setSettings={setSettings} />
          </div></>}
        </div>

        <div key="comments" className="row my-2 py-1 shadow-sm rounded bg-lightgreen">{!import.meta.env.DEV && <Comments website-id="12350" page-id="7" />}</div>
      </div>
    </div>
    <div className="w-100 p-3 bg-navy text-white" key="cont_w100">
      <div className="container-xl" key="cont">git: https://github.com/28raining/circuit-solver</div>
    </div>
  </>
}

export default App;
