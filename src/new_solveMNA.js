// import { loadPyodide } from "pyodide";
// import { initPyodideAndSympy } from "./pyodideLoader";

//FIXME - remove once https://github.com/sympy/sympy/pull/27137 is merged into pyodide
function removeFenced(mathml) {
  // return mathml;
  return mathml.replaceAll(/<mfenced>/g, "<mrow><mo>(</mo>").replaceAll(/<\/mfenced>/g, "<mo>)</mo></mrow>"); // replace <mfenced> with <mo>{</mo>
}
async function solveWithSymPy(matrixStr, mnaMatrix, elementMap, resIndex, resIndex2, componentValuesSolved, pyodide) {
  // const pyodide = await initPyodideAndSympy();
  const symbols = `${[...Object.keys(elementMap), "s"].join(", ")} = symbols("${[...Object.keys(elementMap), "s"].join(" ")}", positive=True, real=True)`;
  const matrixStrPow = matrixStr.replaceAll("^", "**");

  const sympyString = `
${symbols}
${
  mnaMatrix.length == 1
    ? `mna_vo_vi = 1/(${mnaMatrix[0]})` //fixme - this is untested, unsure when this case can get hit
    : `
mna = Matrix([${matrixStrPow}])
mna_inv = mna.inv()
${
  resIndex2.length == 0
    ? `mna_vo_vi = mna_inv[${resIndex[0] - 1}, ${resIndex[1] - 1}]`
    : `mna_vo_vi = mna_inv[${resIndex[0] - 1}, ${resIndex[1] - 1}] - mna_inv[${resIndex2[0] - 1}, ${resIndex2[1] - 1}]`
}`
}

result_simplified = simplify(mna_vo_vi)

str(result_simplified), mathml(result_simplified, printer='presentation')
`;
  try {
    const [textResult, mathml] = await pyodide.runPythonAsync(sympyString);

    return [textResult, removeFenced(mathml)];
  } catch (err) {
    console.log("Solving MNA matrix failed with this error:", err);
    return ["", ""];
  }
}

// all these equations are based on
// https://lpsa.swarthmore.edu/Systems/Electrical/mna/MNAAll.html
export async function build_and_solve_mna(numNodes, chosenPlot, fullyConnectedComponents, componentValuesSolved, pyodide) {
  var i, vinNode, iinNode;

  //Are we plotting current or voltage?
  const plottingI = fullyConnectedComponents[chosenPlot[0]].type === "iprobe";

  const elementMap = fullyConnectedComponents;
  const numIprb = Object.values(elementMap).filter((el) => el.type === "iprobe").length;
  const numOpAmps = Object.values(elementMap).filter((el) => el.type === "opamp").length;
  const numVCVS = Object.values(elementMap).filter((el) => el.type === "vcvs").length;
  // const numVCIS = Object.values(elementMap).filter((el) => el.type === "vcis").length;
  const numActives = numOpAmps + numVCVS;

  // console.log("nodeArray 2", nodeArray);
  // console.log("elementMap", elementMap);

  if ("vin" in elementMap) {
    vinNode = elementMap["vin"].ports[0];
  } else if ("iin" in elementMap) {
    iinNode = elementMap["iin"].ports[0];
  } else {
    console.log("no iin or vin");
    return;
  }
  const iinOrVin = "vin" in elementMap ? "vin" : "iin";
  const extraRow = iinOrVin == "vin" ? 1 : 0;

  var mnaMatrix = new Array(numNodes + extraRow + numActives + numIprb);
  for (i = 0; i < mnaMatrix.length; i++) mnaMatrix[i] = new Array(mnaMatrix.length).fill("0");

  // Step 1 - loop thru elementMap and start adding things to the MNA
  var laplaceElement;
  for (const name in elementMap) {
    const el = elementMap[name];
    if (["inductor", "capacitor", "resistor"].includes(el.type)) {
      if (el.type == "resistor") laplaceElement = name;
      else if (el.type == "inductor") laplaceElement = `(s*${name})`;
      else laplaceElement = `1/(s*${name})`;

      //2.1 in the diagonal is the sum of all impedances connected to that node
      for (const p of el.ports) if (p !== null) mnaMatrix[p][p] += `+${laplaceElement}^(-1)`;

      //2.2 elements connected between two nodes need to appear off the diagonals
      if (!el.ports.includes(null)) {
        mnaMatrix[el.ports[0]][el.ports[1]] += `-${laplaceElement}^(-1)`;
        mnaMatrix[el.ports[1]][el.ports[0]] += `-${laplaceElement}^(-1)`;
      }
    }
  }

  if (iinOrVin == "vin") {
    //2.3 Add a 1 in the bottom row indicating which node is Vin connected too
    mnaMatrix[numNodes][vinNode] = "1";

    //2.4 Add a 1 in the node connected to Vin to indicate that Iin flows into that node
    mnaMatrix[vinNode][numNodes] = "1";
  }

  // console.log("mnaMatrix", mnaMatrix);

  // try {
  //2.5 For each op-amp add some 1's. It says that 2 nodes are equal to each other, and that 1 node has a new ideal current source
  // var opAmp = 0;
  //port 0 -> +
  //port 1 -> -
  //port 2 -> out
  //2.6 Current probes. The last rows are for current probes. 4x 1's are inserted to the Matrix, unless one node is ground
  // current probes are implemented as 0V voltage sources, because the i thru voltage sources ends up in the resulting matric
  var opAmpCounter = 0;
  var iprbCounter = 0;
  for (const name in elementMap) {
    const el = elementMap[name];
    if (el.type === "opamp") {
      if (el.ports[0] != null) mnaMatrix[numNodes + extraRow + opAmpCounter][el.ports[0]] = "1";
      if (el.ports[1] != null) mnaMatrix[numNodes + extraRow + opAmpCounter][el.ports[1]] = "-1";
      if (el.ports[2] != null) mnaMatrix[el.ports[2]][numNodes + extraRow + opAmpCounter] = "1";
      opAmpCounter++;
    } else if (el.type === "vcvs") {
      if (el.ports[0] != null) mnaMatrix[numNodes + extraRow + opAmpCounter][el.ports[0]] = `+${name}`;
      if (el.ports[1] != null) mnaMatrix[numNodes + extraRow + opAmpCounter][el.ports[1]] = `-${name}`;
      if (el.ports[2] != null) mnaMatrix[numNodes + extraRow + opAmpCounter][el.ports[2]] += `+1`;
      if (el.ports[3] != null) mnaMatrix[numNodes + extraRow + opAmpCounter][el.ports[3]] += `-1`;
      if (el.ports[2] != null) mnaMatrix[el.ports[2]][numNodes + extraRow + opAmpCounter] = "1";
      if (el.ports[3] != null) mnaMatrix[el.ports[3]][numNodes + extraRow + opAmpCounter] = "-1";
      opAmpCounter++;
    } else if (el.type === "vcis") {
      if (el.ports[2] != null && el.ports[0] != null) mnaMatrix[el.ports[2]][el.ports[0]] += `-${name}`;
      if (el.ports[2] != null && el.ports[1] != null) mnaMatrix[el.ports[2]][el.ports[1]] += `+${name}`;
      if (el.ports[3] != null && el.ports[0] != null) mnaMatrix[el.ports[3]][el.ports[0]] += `+${name}`;
      if (el.ports[3] != null && el.ports[1] != null) mnaMatrix[el.ports[3]][el.ports[1]] += `-${name}`;
    } else if (el.type === "iprobe") {
      mnaMatrix[numNodes + extraRow + numActives + iprbCounter][el.ports[0]] = "1";
      mnaMatrix[el.ports[0]][numNodes + extraRow + numActives + iprbCounter] = "1";
      mnaMatrix[numNodes + extraRow + numActives + iprbCounter][el.ports[1]] = "-1";
      mnaMatrix[el.ports[1]][numNodes + extraRow + numActives + iprbCounter] = "-1";
      iprbCounter++;
    }
  }

  var nerdStrArr = [];
  for (i = 0; i < mnaMatrix.length; i++) {
    nerdStrArr.push("[" + mnaMatrix[i].join(",") + "]");
  }
  const nerdStr = nerdStrArr.join(",");

  var resIndex = [];
  var resIndex2 = [];
  if (plottingI) {
    if (iinOrVin == "vin") resIndex.push(mnaMatrix.length, numNodes + 1);
    else resIndex.push(mnaMatrix.length, iinNode + 1);
  } else {
    const voutNode = elementMap[chosenPlot[0]].ports[0];
    if (iinOrVin == "vin") resIndex.push(voutNode + 1, numNodes + 1);
    else resIndex.push(voutNode + 1, iinNode + 1);
    if (chosenPlot.length == 2) {
      //are we plotting V or deltaV?
      const voutNode2 = elementMap[chosenPlot[1]].ports[0];
      if (iinOrVin == "vin") resIndex2.push(voutNode2 + 1, numNodes + 1);
      else resIndex2.push(voutNode2 + 1, iinNode + 1);
    }
  }
  var textResult, mathml;

  [textResult, mathml] = await solveWithSymPy(nerdStr, mnaMatrix, elementMap, resIndex, resIndex2, componentValuesSolved, pyodide);

  return [textResult, mathml];
}

export async function calcBilinear(solver) {
  const sympyString = `
T, Z = symbols("T Z")
bilinear = result_simplified.subs(s,(2/T)*(Z-1)/(Z+1))
bilinear_simp = simplify(bilinear)
str(bilinear_simp), mathml(bilinear_simp, printer='presentation')
`;
  const [res, mathml] = await solver.runPythonAsync(sympyString);
  // console.log("bilinear transform", res, mathml);

  return [res, removeFenced(mathml)];
}

export async function new_calculate_tf(pyodide, fRange, numSteps, componentValuesSolved, setErrorSnackbar) {
  if (!pyodide) return { freq_new: [], mag_new: [], phase_new: [], numericML: "", numericText: "" };

  // Generate frequency array (logarithmic steps)
  var fstepdB_20 = Math.log10(fRange.fmax / fRange.fmin) / numSteps;
  var fstep = 10 ** fstepdB_20;
  const freq = [];
  for (var f = fRange.fmin; f < fRange.fmax; f = f * fstep) {
    freq.push(f);
  }

  try {
    // Use sympy to calculate magnitudes and phases for all frequencies and numeric representation
    // Optimized: Use lambdify to create a fast numeric function instead of slow evalf() calls
    const sympyString = `

result_numeric = result_simplified.subs(${JSON.stringify(componentValuesSolved).replaceAll('"', "")})
result_numeric_simplified = simplify(result_numeric)

# Calculate numeric MathML and text representation
numeric_mathml = mathml(result_numeric_simplified, printer='presentation')
numeric_text = str(result_numeric_simplified)

# Create a lambdified numeric function for fast evaluation
# This converts the symbolic expression to a numeric function that can be evaluated much faster
numeric_func = lambdify(s, result_numeric_simplified)

# Evaluate for all frequencies using the fast numeric function
freq_array = ${JSON.stringify(freq)}
mag_array = []
phase_array = []

for f in freq_array:
    s_val = 2 * pi * f * 1j  # Use Python's 1j for complex number
    result_complex = numeric_func(s_val)
    # Convert to plain Python complex to avoid SymPy/Pyodide overhead
    result_complex = complex(result_complex)
    # Use manual magnitude calculation which is faster than abs() on Pyodide proxies
    mag_val = (result_complex.real**2 + result_complex.imag**2)**0.5
    # Use Python's built-in cmath.phase() for fast numeric calculation
    phase_val = cmath.phase(result_complex)
    mag_array.append(mag_val)
    phase_array.append(phase_val)

# Convert to plain Python floats to avoid Pyodide proxy issues
# Ensure all values are plain floats (not sympy objects)
mag_list = [float(x) for x in mag_array]
phase_list = [float(x) for x in phase_array]

(numeric_mathml, numeric_text, mag_list, phase_list)
`;
    const result = await pyodide.runPythonAsync(sympyString);
    // Pyodide returns a tuple as a proxy object - access elements by index
    if (!result || result.length !== 4) {
      throw new Error(`Unexpected result from Python: length=${result?.length}`);
    }
    const numericML = result[0];
    const numericText = result[1];
    const mag = result[2];
    const phase = result[3];
    
    // Convert Pyodide arrays to JavaScript arrays - extract values immediately to avoid proxy exhaustion
    const magArray = [];
    const phaseArray = [];
    for (let i = 0; i < mag.length; i++) {
      magArray.push(Number(mag[i]));
    }
    for (let i = 0; i < phase.length; i++) {
      phaseArray.push(Number(phase[i]));
    }
    return { 
      freq_new: freq, 
      mag_new: magArray,
      phase_new: phaseArray,
      numericML: removeFenced(String(numericML)),
      numericText: String(numericText).replaceAll("**", "^")
    };
  } catch (err) {
    setErrorSnackbar((x) => {
      if (!x) return true;
      else return x;
    });
    console.log("Error calculating transfer function:", err);
    return { freq_new: [], mag_new: [], phase_new: [], numericML: "", numericText: "" };
  }
}
