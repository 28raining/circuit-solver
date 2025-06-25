import * as Algebrite from "algebrite";
import simplify_algebra from "./simplify_algebra.js";
// import { simplify, parse, derivative,create, all } from 'mathjs'
// const math = create(all);
// import * as cMathMLHandler  from 'mathjs-mathml';
//modified nodal analysis
//only call this function when the schematic is ready
// -- there is a path from vin to vout
//FIXME - remove noeArray? Just use biggest number in fullyConnectedComponents?

// all these equations are based on
// https://lpsa.swarthmore.edu/Systems/Electrical/mna/MNAAll.html
export function build_and_solve_mna(nodeArray, componentDefinitions, chosenPlot, fullyConnectedComponents) {
  // var extraRow = 0;
  var i, j;
  // var voutNode;
  var vinNode;
  var iinNode;
  // if (iinOrVin == "vin") extraRow = 1;
  // for (const key in usedElements) if (usedElements.type == "opamp") numOpAmps += 1;
  // for (const key in usedElements) if (usedElements.type == "iprobe") numIprb += 1;
  // Create 2D modified nodal analysis array

  // Step 1 - create map of every element and which node it connects too. Doing this here, after node map is complete and ground node is removed
  var opAmpsMap = {};
  // // var iprbMap = {};
  // var elementMap = {};
  // // for (i = 0; i < nodeArray.length; i++) {
  // nodeArray.forEach((node, i) => {
  //   // for (j = 0; j < nodeArray[i].length; j++) {
  //   node.forEach((comp, j) => {
  //     // element = comp.name;
  //     if (!(comp.name in elementMap)) {
  //       elementMap[comp.name] = {
  //         ports: Array(componentDefinitions[comp.type].connectors.length).fill(null),
  //         type: comp.type,
  //       };
  //     }
  //     elementMap[comp.name].ports[comp.port] = i;

  //     //FIXME - can these maps be eliminated now elementMap is more detailed?
  //     if (comp.type == "opamp") {
  //       if (!(comp.name in opAmpsMap)) opAmpsMap[comp.name] = [null, null, null];
  //       opAmpsMap[comp.name][comp.port] = i;
  //     // } else if (comp.type == "iprobe") {
  //     //   if (!(comp.name in iprbMap)) iprbMap[comp.name] = [null, null];
  //     //   iprbMap[comp.name][comp.port] = i;
  //     //   if (comp.port == 0) iprbNode = i;
  //     }
  //   });
  // });

  //Are we plotting current or voltage?
  const plottingI = fullyConnectedComponents[chosenPlot[0]].type === "iprobe";

  const elementMap = fullyConnectedComponents;

  // const numOpAmps = Object.keys(opAmpsMap).length;
  // const numIprb = Object.keys(iprbMap).length;
  const numIprb = Object.values(elementMap).filter(el => el.type === "iprobe").length;
  const numOpAmps = Object.values(elementMap).filter(el => el.type === "opamp").length;

  console.log("nodeArray 2", nodeArray);
  console.log("elementMap", elementMap);

  // if ("X0" in elementMap) voutNode = elementMap["X0"].ports[0];
  if ("vin" in elementMap) {
    vinNode = elementMap["vin"].ports[0];
  } else if ("iin" in elementMap) {
    iinNode = elementMap["iin"].ports[0];
  } else {
    console.log("no iin or vin");
    return;
  }
  const iinOrVin = "vin" in elementMap ? "vin" : "iin";
  const extraRow = (iinOrVin == "vin") ? 1 : 0;


  var mnaMatrix = new Array(nodeArray.length + extraRow + numOpAmps + numIprb);
  for (i = 0; i < mnaMatrix.length; i++) mnaMatrix[i] = new Array(mnaMatrix.length).fill("0");

  // Step 2 - loop thru elementMap and start adding things to the MNA
  var laplaceElement;
  // for (const key2 in elementMap) {
  // elementMap.forEach((el, idx) => {

  for (const name in elementMap) {
    const el = elementMap[name];
    if (["inductor", "capacitor", "resistor"].includes(el.type)) {
      if (el.type == "resistor") laplaceElement = name;
      else if (el.type == "inductor") laplaceElement = `(s*${name})`;
      else laplaceElement = `1/(s*${name})`;

      //2.1 in the diagonal is the sum of all impedances connected to that node
      // for (j = 0; j < el.ports.length; j++) {
      //   mnaMatrix[el.ports[j]][el.ports[j]] += "+" + laplaceElement + "^(-1)";
      // }
      for (const p of el.ports) if (p !== null) mnaMatrix[p][p] += `+${laplaceElement}^(-1)`;
      //2.2 elements connected between two nodes need to appear off the diagonals
      if (!el.ports.includes(null)) {
        mnaMatrix[el.ports[0]][el.ports[1]] += `-${laplaceElement}^(-1)`;
        mnaMatrix[el.ports[1]][el.ports[0]] += `-${laplaceElement}^(-1)`;
      }
    }
  }

  //   letters = Array.from(key2);
  //   if (
  //     letters[0] != "v" &&
  //     letters[0] != "g" &&
  //     letters[0] != "o" &&
  //     letters[0] != "x" &&
  //     letters[0] != "i" &&
  //     letters[0] != "Y"
  //   ) {
  //     if (letters[0] == "R") laplaceElement = key2;
  //     else if (letters[0] == "L") laplaceElement = "(s*" + key2 + ")";
  //     else laplaceElement = "1/(s*" + key2 + ")";

  //     //2.1 in the diagonal is the sum of all impedances connected to that node
  //     for (j = 0; j < elementMap[key2].length; j++) {
  //       mnaMatrix[elementMap[key2][j]][elementMap[key2][j]] += "+" + laplaceElement + "^(-1)";
  //     }
  //     //2.2 elements connected between two nodes need to appear off the diagonals
  //     if (elementMap[key2].length > 1) {
  //       mnaMatrix[elementMap[key2][0]][elementMap[key2][1]] += "-" + laplaceElement + "^(-1)";
  //       mnaMatrix[elementMap[key2][1]][elementMap[key2][0]] += "-" + laplaceElement + "^(-1)";
  //     }
  //   }
  // }
  if (iinOrVin == "vin") {
    //2.3 Add a 1 in the bottom row indicating which node is Vin connected too
    mnaMatrix[mnaMatrix.length - 1 - numOpAmps - numIprb][vinNode] = "1";

    //2.4 Add a 1 in the node connected to Vin to indicate that Iin flows into that node
    mnaMatrix[vinNode][mnaMatrix.length - 1 - numOpAmps - numIprb] = "1";
  }

  console.log("mnaMatrix", mnaMatrix);

  try {
    var idx;
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
        if (el.ports[0] != null) mnaMatrix[nodeArray.length + extraRow + opAmpCounter][el.ports[0]] = "1";
        if (el.ports[1] != null) mnaMatrix[nodeArray.length + extraRow + opAmpCounter][el.ports[1]] = "-1";
        if (el.ports[2] != null) mnaMatrix[el.ports[2]][nodeArray.length + extraRow + opAmpCounter] = "1";
        opAmpCounter++;
      } else if (el.type === "iprobe") {
        console.log("iprobe", nodeArray.length + extraRow + numOpAmps + iprbCounter, el.ports[0]);
        mnaMatrix[nodeArray.length + extraRow + numOpAmps + iprbCounter][el.ports[0]] = "1";
        mnaMatrix[el.ports[0]][nodeArray.length + extraRow + numOpAmps + iprbCounter] = "1";
        mnaMatrix[nodeArray.length + extraRow + numOpAmps + iprbCounter][el.ports[1]] = "-1";
        mnaMatrix[el.ports[1]][nodeArray.length + extraRow + numOpAmps + iprbCounter] = "-1";
        iprbCounter++;
      }
    }



    
    // var iprbCounter = 0;
    // for (const key in iprbMap) {
    //   idx = parseInt(key);
    //   if (iprbMap[key][0] != null) {
    //     mnaMatrix[nodeMap.length + 1 + numOpAmps + iprbCounter][iprbMap[idx][0]] = "1";
    //     mnaMatrix[iprbMap[idx][0]][nodeMap.length + 1 + numOpAmps + iprbCounter] = "1";
    //   }
    //   if (iprbMap[key][1] != null) {
    //     mnaMatrix[nodeMap.length + 1 + numOpAmps + iprbCounter][iprbMap[idx][1]] = "-1";
    //     mnaMatrix[iprbMap[idx][1]][nodeMap.length + 1 + numOpAmps + iprbCounter] = "-1";
    //   }
    //   iprbCounter = iprbCounter + 1;
    // }

    // var iprbCounter = 0;
    // for (const el in elementMap) {
    //   if (elementMap[el].type !== "iprobe") continue; //skip non-iprobe elements
    //   const iprb = elementMap[el];
    //   console.log("iprobe", iprb, iprbCounter, nodeArray.length, numOpAmps, mnaMatrix);
    //   mnaMatrix[nodeArray.length + 1 + numOpAmps + iprbCounter][iprb.ports[0]] = "1";
    //   mnaMatrix[iprb.ports[0]][nodeArray.length + 1 + numOpAmps + iprbCounter] = "1";
    //   mnaMatrix[nodeArray.length + 1 + numOpAmps + iprbCounter][iprb.ports[1]] = "-1";
    //   mnaMatrix[iprb.ports[1]][nodeArray.length + 1 + numOpAmps + iprbCounter] = "-1";
    //   iprbCounter = iprbCounter + 1;
    // }

    var nerdStrArr = [];
    var nerdStr = "";
    for (i = 0; i < mnaMatrix.length; i++) {
      nerdStrArr.push("[" + mnaMatrix[i].join(",") + "]");
    }
    nerdStr = nerdStrArr.join(",");
    // if (debug) console.log("mnaMatrix", mnaMatrix);

    //Using algebrite not nerdamer
    console.log("nerdStr", nerdStr);
    Algebrite.eval("clearall");
    Algebrite.eval("mna = [" + nerdStr + "]");

    if (mnaMatrix.length == 1) {
      Algebrite.eval(`mna_vo_vi = 1/(${mnaMatrix[0]})`); //FIXME - is this correct? When is it hit, with Iin?
    } else {
      Algebrite.eval("inv_mna = inv(mna)");
      // if (iinOrVin == "vin") {
      //   //FIXME - simplify this
      //   if (chosenPlot == "vo" || iprbNode == null) {
      //     Algebrite.eval("mna_vo_vi = (inv_mna[" + (voutNode + 1) + "][" + (mnaMatrix.length - numOpAmps - numIprb) + "])");
      //   } else {
      //     //current thru the probe is this equation
      //     Algebrite.eval("mna_vo_vi = (inv_mna[" + mnaMatrix.length + "][" + (mnaMatrix.length - numOpAmps - numIprb) + "])");
      //   }
      // } else {
      //   if (chosenPlot == "vo" || iprbNode == null) {
      //     Algebrite.eval("mna_vo_vi = (inv_mna[" + (voutNode + 1) + "][" + (iinNode + 1) + "])");
      //   } else {
      //     Algebrite.eval("mna_vo_vi = (inv_mna[" + mnaMatrix.length + "][" + (iinNode + 1) + "])");
      //   }
      // }
      //NEW
      if (plottingI) {
        if (iinOrVin == "vin")  Algebrite.eval("mna_vo_vi = (inv_mna[" + mnaMatrix.length + "][" + (mnaMatrix.length - numOpAmps - numIprb) + "])");
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
          if (iinOrVin == "vin") Algebrite.eval(`mna_vo_vi = inv_mna[${voutNode1 + 1}][${mnaMatrix.length - numOpAmps - numIprb}] - inv_mna[${voutNode2 + 1}][${mnaMatrix.length - numOpAmps - numIprb}]`);
          else Algebrite.eval(`mna_vo_vi = inv_mna[${voutNode1 + 1}][${iinNode + 1}] - inv_mna[${voutNode2 + 1}][${iinNode + 1}]`);

        }
      }
    }

    
    var strOut = Algebrite.eval("mna_vo_vi").toString(); //4ms
    
    for (const c in fullyConnectedComponents) strOut = strOut.replaceAll(c, fullyConnectedComponents[c].value);// Algebrite.eval(`mna_vo_vi = subst(${fullyConnectedComponents[c].value},${c},mna_vo_vi)`);
    // var z = expr.replace(/([CRL]+)([0-9]*)/g, "$1_$2"); //Swap R0 for R_0 so this new library can consume it

    const [textResult, mathml] = simplify_algebra(strOut);
    console.log("mna_vo_vi", strOut, textResult);

    // const aaa = simplify(textResult);
    // console.log("mathml", aaa.toString(cMathMLHandler));

    // schematicReadiness.solvable = true;

    Algebrite.eval("complex_response = subst(s*i,s,mna_vo_vi)");
    Algebrite.eval("abs_complex_response = abs(complex_response)");

    const complex_response = Algebrite.eval("abs_complex_response").toString();

    // for (const key in allElements) {

    // if ((key in elements)) {
    //   //handle renaming
    //   if (elements[key].displayName != key) {
    //     var dispLetters = Array.from(elements[key].displayName);
    //     resMathML = resMathML.replaceAll(
    //       `<mi>${firstLetter}</mi><mn>${allLetters.slice(1, allLetters.length).join("")}</mn>`,
    //       `<mi>${firstLetter}</mi><mn>${dispLetters.slice(1, dispLetters.length).join("")}</mn>`
    //     );
    //   }
    // }
    // }
    // console.log("resMathML NEW", mathml, latex);
    return [textResult, mathml, complex_response];
  } catch (err) {
    console.log("Building MNA matrix failed with this error:", err);
    //FIXME - show the toast
    return ["", "", ""];
  }
}

export function calcBilinear() {
  // var discard, bilinearMathML, x;
  Algebrite.eval("bilinear = subst((2/T)*(Z-1)/(Z+1),s,mna_vo_vi)");
  try {
    return simplify_algebra(Algebrite.eval("bilinear").toString());
      // return mathml;
    // discard = x[0]
    // bilinearMathML = x[1]
  } catch (err) {
    console.log(err)
    return ["", "<mtext>Having trouble calculating bilinear transform</mtext>"];
  }


}
