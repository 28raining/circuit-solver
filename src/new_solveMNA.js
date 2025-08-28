import * as Algebrite from "algebrite";
import simplify_algebra from "./simplify_algebra.js";
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
mna_vo_vi_complex = mna_vo_vi.subs(s, s*I)

result_simplified = simplify(mna_vo_vi)
result_numeric = result_simplified.subs(${JSON.stringify(componentValuesSolved).replaceAll('"', "")})
result_numeric_simplified = simplify(result_numeric)
result_numeric_complex = result_numeric_simplified.subs(s, s*I)
rx = Abs(result_numeric_complex)

str(result_simplified), mathml(result_simplified, printer='presentation'), str(rx), mathml(result_numeric_simplified, printer='presentation'), str(result_numeric_simplified)
`;
  const [textResult, mathml, complex_response, numericML, numericText] = await pyodide.runPythonAsync(sympyString);
  const newNumeric = numericML;
  const newNumericText = numericText.replaceAll("**", "^");

  return [textResult, removeFenced(mathml), complex_response, removeFenced(newNumeric), newNumericText];
}

async function solveWithAlgebrite(matrixStr, mnaMatrix, resIndex, resIndex2) {
  try {
    Algebrite.eval("clearall");

    if (mnaMatrix.length == 1) {
      Algebrite.eval(`mna_vo_vi = 1/(${mnaMatrix[0]})`); //FIXME - is this correct? When is it hit, with Iin?
    } else {
      Algebrite.eval(`mna = [${matrixStr}]`);
      Algebrite.eval("inv_mna = inv(mna)");
      if (resIndex2.length == 0) {
        Algebrite.eval(`mna_vo_vi = inv_mna[${resIndex[0]}][${resIndex[1]}]`);
      } else {
        Algebrite.eval(`mna_vo_vi = inv_mna[${resIndex[0]}][${resIndex[1]}] - inv_mna[${resIndex2[0]}][${resIndex2[1]}]`);
      }
    }

    var strOut = Algebrite.eval("mna_vo_vi").toString(); //4ms

    const [textResult, mathml] = simplify_algebra(strOut);

    Algebrite.eval("complex_response = subst(s*i,s,mna_vo_vi)");
    Algebrite.eval("abs_complex_response = abs(complex_response)");

    const complex_response = Algebrite.eval("abs_complex_response").toString();

    return [textResult, mathml, complex_response];
  } catch (err) {
    console.log("Building MNA matrix failed with this error:", err);
    //FIXME - show the toast
    return ["", "", ""];
  }
}

// all these equations are based on
// https://lpsa.swarthmore.edu/Systems/Electrical/mna/MNAAll.html
export async function build_and_solve_mna(numNodes, chosenPlot, fullyConnectedComponents, componentValuesSolved, pyodide, solver) {
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
  var numericResult, textResult, mathml, complex_response, numericText;

  if (solver === "algebrite") {
    [textResult, mathml, complex_response] = solveWithAlgebrite(nerdStr, mnaMatrix, resIndex, resIndex2);
  } else {
    [textResult, mathml, complex_response, numericResult, numericText] = await solveWithSymPy(nerdStr, mnaMatrix, elementMap, resIndex, resIndex2, componentValuesSolved, pyodide);
  }

  return [textResult, mathml, complex_response, numericResult, numericText];
}

export async function calcBilinear(solver) {
  if (solver) {
    const sympyString = `
T, Z = symbols("T Z")
bilinear = result_simplified.subs(s,(2/T)*(Z-1)/(Z+1))
bilinear_simp = simplify(bilinear)
str(bilinear_simp), mathml(bilinear_simp, printer='presentation')
`;
    const [res, mathml] = await solver.runPythonAsync(sympyString);
    // console.log("bilinear transform", res, mathml);

    return [res, removeFenced(mathml)];
  } else {
    Algebrite.eval("bilinear = subst((2/T)*(Z-1)/(Z+1),s,mna_vo_vi)");
    try {
      return simplify_algebra(Algebrite.eval("bilinear").toString());
    } catch (err) {
      console.log(err);
      return ["", "<mtext>Having trouble calculating bilinear transform</mtext>"];
    }
  }
}
