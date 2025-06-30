import * as Algebrite from "algebrite";
import simplify_algebra from "./simplify_algebra.js";

// all these equations are based on
// https://lpsa.swarthmore.edu/Systems/Electrical/mna/MNAAll.html
export function build_and_solve_mna(numNodes, chosenPlot, fullyConnectedComponents, componentValuesSolved) {
  var i, vinNode, iinNode;

  //Are we plotting current or voltage?
  const plottingI = fullyConnectedComponents[chosenPlot[0]].type === "iprobe";

  const elementMap = fullyConnectedComponents;
  const numIprb = Object.values(elementMap).filter((el) => el.type === "iprobe").length;
  const numOpAmps = Object.values(elementMap).filter((el) => el.type === "opamp").length;

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

  var mnaMatrix = new Array(numNodes + extraRow + numOpAmps + numIprb);
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
    mnaMatrix[mnaMatrix.length - 1 - numOpAmps - numIprb][vinNode] = "1";

    //2.4 Add a 1 in the node connected to Vin to indicate that Iin flows into that node
    mnaMatrix[vinNode][mnaMatrix.length - 1 - numOpAmps - numIprb] = "1";
  }

  // console.log("mnaMatrix", mnaMatrix);

  try {
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
      } else if (el.type === "iprobe") {
        console.log("iprobe", numNodes + extraRow + numOpAmps + iprbCounter, el.ports[0]);
        mnaMatrix[numNodes + extraRow + numOpAmps + iprbCounter][el.ports[0]] = "1";
        mnaMatrix[el.ports[0]][numNodes + extraRow + numOpAmps + iprbCounter] = "1";
        mnaMatrix[numNodes + extraRow + numOpAmps + iprbCounter][el.ports[1]] = "-1";
        mnaMatrix[el.ports[1]][numNodes + extraRow + numOpAmps + iprbCounter] = "-1";
        iprbCounter++;
      }
    }

    var nerdStrArr = [];
    for (i = 0; i < mnaMatrix.length; i++) {
      nerdStrArr.push("[" + mnaMatrix[i].join(",") + "]");
    }
    const nerdStr = nerdStrArr.join(",");

    //Using algebrite not nerdamer
    Algebrite.eval("clearall");
    Algebrite.eval("mna = [" + nerdStr + "]");

    if (mnaMatrix.length == 1) {
      Algebrite.eval(`mna_vo_vi = 1/(${mnaMatrix[0]})`); //FIXME - is this correct? When is it hit, with Iin?
    } else {
      Algebrite.eval("inv_mna = inv(mna)");

      if (plottingI) {
        if (iinOrVin == "vin") Algebrite.eval("mna_vo_vi = (inv_mna[" + mnaMatrix.length + "][" + (mnaMatrix.length - numOpAmps - numIprb) + "])");
        else Algebrite.eval("mna_vo_vi = (inv_mna[" + mnaMatrix.length + "][" + (iinNode + 1) + "])");
      } else {
        //are we plotting V or deltaV?
        if (chosenPlot.length == 1) {
          const voutNode = elementMap[chosenPlot[0]].ports[0];
          if (iinOrVin == "vin") Algebrite.eval("mna_vo_vi = (inv_mna[" + (voutNode + 1) + "][" + (mnaMatrix.length - numOpAmps - numIprb) + "])");
          else Algebrite.eval("mna_vo_vi = (inv_mna[" + (voutNode + 1) + "][" + (iinNode + 1) + "])");
        } else {
          //if we are plotting a deltaV, we need to subtract the two nodes
          const voutNode1 = elementMap[chosenPlot[0]].ports[0];
          const voutNode2 = elementMap[chosenPlot[1]].ports[0];
          if (iinOrVin == "vin")
            Algebrite.eval(
              `mna_vo_vi = inv_mna[${voutNode1 + 1}][${mnaMatrix.length - numOpAmps - numIprb}] - inv_mna[${voutNode2 + 1}][${mnaMatrix.length - numOpAmps - numIprb}]`,
            );
          else Algebrite.eval(`mna_vo_vi = inv_mna[${voutNode1 + 1}][${iinNode + 1}] - inv_mna[${voutNode2 + 1}][${iinNode + 1}]`);
        }
      }
    }

    var strOut = Algebrite.eval("mna_vo_vi").toString(); //4ms

    for (const c in componentValuesSolved) strOut = strOut.replaceAll(c, componentValuesSolved[c]); // Algebrite.eval(`mna_vo_vi = subst(${fullyConnectedComponents[c].value},${c},mna_vo_vi)`);
    // var z = expr.replace(/([CRL]+)([0-9]*)/g, "$1_$2"); //Swap R0 for R_0 so this new library can consume it

    const [textResult, mathml] = simplify_algebra(strOut);
    // console.log("mna_vo_vi", strOut, textResult);

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

export function calcBilinear() {
  Algebrite.eval("bilinear = subst((2/T)*(Z-1)/(Z+1),s,mna_vo_vi)");
  try {
    return simplify_algebra(Algebrite.eval("bilinear").toString());
  } catch (err) {
    console.log(err);
    return ["", "<mtext>Having trouble calculating bilinear transform</mtext>"];
  }
}
