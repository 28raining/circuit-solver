// const { calculateImpedance } = require('../src/impedanceFunctions.js');
import { expect, test } from "vitest";
import { initPyodideAndSympy } from "./../src/pyodideLoader.js";
import { build_and_solve_mna } from "../src/new_solveMNA.js";

const pyodide = await initPyodideAndSympy();

test("voltage in current probe - 1", async () => {
  const components = {
    Y0: {
      ports: [0, 1],
      type: "iprobe",
    },
    vin: {
      ports: [0],
      type: "vin",
    },
    L0: {
      ports: [0, 2],
      type: "inductor",
    },
    R0: {
      ports: [1, 2],
      type: "resistor",
    },
    C0: {
      ports: [2, null],
      type: "capacitor",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml, complex_response, _numericResult, numericText] = await build_and_solve_mna(3, ["Y0"], components, values, pyodide, "sympy");
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  // expect(_mathml).toEqual(null);
  expect(complex_response).toEqual("1.0e-24*s**2/sqrt(1.0e-40*s**4 - 1.0e-20*s**2 + 1)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});

test("voltage in current probe (algebrite) - 1", async () => {
  const components = {
    Y0: {
      ports: [0, 1],
      type: "iprobe",
    },
    vin: {
      ports: [0],
      type: "vin",
    },
    L0: {
      ports: [0, 2],
      type: "inductor",
    },
    R0: {
      ports: [1, 2],
      type: "resistor",
    },
    C0: {
      ports: [2, null],
      type: "capacitor",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml, complex_response] = await build_and_solve_mna(3, ["Y0"], components, values, null, "algebrite");
  expect(textResult).toEqual("C0*L0*s^2/(R0+C0*L0*R0*s^2+L0*s)");
  // expect(_mathml).toEqual(null);
  expect(complex_response).toEqual("abs(C0)*abs(s)/((1-2*C0*R0^2/L0+C0^2*R0^2*s^2+R0^2/(L0^2*s^2))^(1/2))");
});

test("voltage in current probe - 2", async () => {
  const components = {
    R0: {
      ports: [0, 1],
      type: "resistor",
    },
    vin: {
      ports: [0],
      type: "vin",
    },
    L0: {
      ports: [0, 2],
      type: "inductor",
    },
    Y0: {
      ports: [1, 2],
      type: "iprobe",
    },
    C0: {
      ports: [2, null],
      type: "capacitor",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml, complex_response, _numericResult, numericText] = await build_and_solve_mna(3, ["Y0"], components, values, pyodide, "sympy");
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  // expect(_mathml).toEqual(null);
  expect(complex_response).toEqual("1.0e-24*s**2/sqrt(1.0e-40*s**4 - 1.0e-20*s**2 + 1)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});

test("current in current probe - 2", async () => {
  const components = {
    L0: {
      ports: [0, 2],
      type: "inductor",
    },
    iin: {
      ports: [0],
      type: "iin",
    },
    Y0: {
      ports: [0, 1],
      type: "iprobe",
    },
    R0: {
      ports: [1, 2],
      type: "resistor",
    },
    C0: {
      ports: [2, null],
      type: "capacitor",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml, complex_response, _numericResult, numericText] = await build_and_solve_mna(3, ["Y0"], components, values, pyodide, "sympy");
  expect(textResult).toEqual("L0*s/(L0*s + R0)");
  // expect(_mathml).toEqual(null);
  expect(complex_response).toEqual("1.0e-10*s/sqrt(1.0e-20*s**2 + 1)");
  expect(numericText).toEqual("1.0e-6*s/(1.0e-6*s + 10000)");
});

test("current in current probe VCIS - 3", async () => {
  const components = {
    G0: {
      ports: [null, 0, 1, null],
      type: "vcis",
    },
    R0: {
      ports: [0, null],
      type: "resistor",
    },
    Y0: {
      ports: [0, 1],
      type: "iprobe",
    },
    iin: {
      ports: [0],
      type: "iin",
    },
  };
  const values = {
    G0: 0.001,
    R0: 1000000,
  };
  const [textResult, _mathml, complex_response, _numericResult, numericText] = await build_and_solve_mna(2, ["Y0"], components, values, pyodide, "sympy");
  expect(textResult).toEqual("G0*R0/(G0*R0 + 1)");
  // expect(_mathml).toEqual(null);
  expect(complex_response).toEqual("0.999000999000999");
  expect(numericText).toEqual("0.999000999000999");
});

test("voltage in voltage probe VCVS", async () => {
  const components = {
    C0: {
      ports: [1, 0],
      type: "capacitor",
    },
    L0: {
      ports: [0, 1],
      type: "inductor",
    },
    vin: {
      ports: [0],
      type: "vin",
    },
    A0: {
      ports: [null, 1, 2, null],
      type: "vcvs",
    },
    R0: {
      ports: [1, null],
      type: "resistor",
    },
    X0: {
      ports: [2],
      type: "vprobe",
    },
  };
  const values = {
    C0: 1e-12,
    L0: 1e-9,
    A0: 100,
    R0: 1000000,
  };
  const [textResult, _mathml, complex_response, _numericResult, numericText] = await build_and_solve_mna(3, ["X0"], components, values, pyodide, "sympy");
  expect(textResult).toEqual("A0*R0*(C0*L0*s**2 + 1)/(C0*L0*R0*s**2 + L0*s + R0)");
  // expect(_mathml).toEqual(null);
  expect(complex_response).toEqual("Abs(1.0e-13*s**2 - 100000000)/(1000000*sqrt(1.0e-42*s**4 - 1.999999999e-21*s**2 + 1))"); //FIXME - this seems to be a sympy bug
  expect(numericText).toEqual("(1.0e-13*s^2 + 100000000)/(1.0e-15*s^2 + 1.0e-9*s + 1000000)");
});
