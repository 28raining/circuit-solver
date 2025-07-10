// src/pyodideLoader.js
import { loadPyodide, version as pyodideVersion } from "pyodide";

export async function initPyodideAndSympy() {
  const pyodide = await loadPyodide({
    indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
  });

  //There's a MathML issue about using 'fenced' syntax which is fixed in Sympmy 1.13.4. However, we only get 1.13.3

  // await pyodide.loadPackage("micropip");
  // const micropip = pyodide.pyimport("micropip");
  // await micropip.install('sympy');
  await pyodide.loadPackage("sympy");
  var initStr = `
from sympy import Matrix, symbols, simplify, Abs, I, fraction, solve
from sympy.printing.mathml import mathml`;
  await pyodide.runPythonAsync(initStr);
  return pyodide;
}
