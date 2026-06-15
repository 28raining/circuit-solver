import { loadPyodide } from "pyodide";

const pyodideIndexUrl = `${import.meta.env.BASE_URL}assets/pyodide/`;

export async function initPyodideAndSympy() {
  const pyodide = await loadPyodide({
    indexURL: pyodideIndexUrl,
  });

  await pyodide.loadPackage(["mpmath", "sympy"]);
  const initStr = `
from sympy import Matrix, symbols, simplify, Abs, I, fraction, solve, arg, pi, lambdify
from sympy.printing.mathml import mathml
import math
import cmath`;
  await pyodide.runPythonAsync(initStr);
  return pyodide;
}
