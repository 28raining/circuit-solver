// const { calculateImpedance } = require('../src/impedanceFunctions.js');
import { expect, test } from "vitest";
import { initPyodideAndSympy } from "./../src/pyodideLoader.js";
import { build_and_solve_mna, new_calculate_tf } from "../src/new_solveMNA.js";

const pyodide = await initPyodideAndSympy();

test("voltage in current probe - 1", async () => {
  const components = {
    y0: {
      ports: [0, 1],
      type: "iprobe",
      sympySymbol: "Y0",
      displayName: "Y0",
    },
    vin: {
      ports: [0],
      type: "vin",
      sympySymbol: "vin",
      displayName: "vin",
    },
    l0: {
      ports: [0, 2],
      type: "inductor",
      sympySymbol: "L0",
      displayName: "L0",
    },
    r0: {
      ports: [1, 2],
      type: "resistor",
      sympySymbol: "R0",
      displayName: "R0",
    },
    c0: {
      ports: [2, null],
      type: "capacitor",
      sympySymbol: "C0",
      displayName: "C0",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["y0"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});

test("voltage in current probe - 2", async () => {
  const components = {
    r0: {
      ports: [0, 1],
      type: "resistor",
      sympySymbol: "R0",
      displayName: "R0",
    },
    vin: {
      ports: [0],
      type: "vin",
      sympySymbol: "vin",
      displayName: "vin",
    },
    l0: {
      ports: [0, 2],
      type: "inductor",
      sympySymbol: "L0",
      displayName: "L0",
    },
    y0: {
      ports: [1, 2],
      type: "iprobe",
      sympySymbol: "Y0",
      displayName: "Y0",
    },
    c0: {
      ports: [2, null],
      type: "capacitor",
      sympySymbol: "C0",
      displayName: "C0",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["y0"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});
test("voltage in current probe - 3", async () => {
  const components = {
    r0: {
      ports: [0, 1],
      type: "resistor",
      sympySymbol: "R0",
      displayName: "R0",
    },
    vin: {
      ports: [0],
      type: "vin",
      sympySymbol: "vin",
      displayName: "vin",
    },
    l0: {
      ports: [0, 2],
      type: "inductor",
      sympySymbol: "L0",
      displayName: "L0",
    },
    y0: {
      ports: [2, null],
      type: "iprobe",
      sympySymbol: "Y0",
      displayName: "Y0",
    },
    c0: {
      ports: [2, null],
      type: "capacitor",
      sympySymbol: "C0",
      displayName: "C0",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["y0"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("1/(L0*s)");
  expect(numericText).toEqual("1000000.0/s");
});

test("current in current probe - 2", async () => {
  const components = {
    l0: {
      ports: [0, 2],
      type: "inductor",
      sympySymbol: "L0",
      displayName: "L0",
    },
    iin: {
      ports: [0],
      type: "iin",
      sympySymbol: "iin",
      displayName: "iin",
    },
    y0: {
      ports: [0, 1],
      type: "iprobe",
      sympySymbol: "Y0",
      displayName: "Y0",
    },
    r0: {
      ports: [1, 2],
      type: "resistor",
      sympySymbol: "R0",
      displayName: "R0",
    },
    c0: {
      ports: [2, null],
      type: "capacitor",
      sympySymbol: "C0",
      displayName: "C0",
    },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["y0"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("L0*s/(L0*s + R0)");
  expect(numericText).toEqual("1.0e-6*s/(1.0e-6*s + 10000)");
});

test("current in current probe VCIS - 3", async () => {
  const components = {
    g0: {
      ports: [null, 0, 1, null],
      type: "vcis",
      sympySymbol: "G0",
      displayName: "G0",
    },
    r0: {
      ports: [0, null],
      type: "resistor",
      sympySymbol: "R0",
      displayName: "R0",
    },
    y0: {
      ports: [0, 1],
      type: "iprobe",
      sympySymbol: "Y0",
      displayName: "Y0",
    },
    iin: {
      ports: [0],
      type: "iin",
      sympySymbol: "iin",
      displayName: "iin",
    },
  };
  const values = {
    G0: 0.001,
    R0: 1000000,
  };
  const [textResult, _mathml] = await build_and_solve_mna(2, ["y0"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("G0*R0/(G0*R0 + 1)");
  expect(numericText).toEqual("0.999000999000999");
});

test("voltage in voltage probe VCVS", async () => {
  const components = {
    c0: {
      ports: [1, 0],
      type: "capacitor",
      sympySymbol: "C0",
      displayName: "C0",
    },
    l0: {
      ports: [0, 1],
      type: "inductor",
      sympySymbol: "L0",
      displayName: "L0",
    },
    vin: {
      ports: [0],
      type: "vin",
      sympySymbol: "vin",
      displayName: "vin",
    },
    a0: {
      ports: [null, 1, 2, null],
      type: "vcvs",
      sympySymbol: "A0",
      displayName: "A0",
    },
    r0: {
      ports: [1, null],
      type: "resistor",
      sympySymbol: "R0",
      displayName: "R0",
    },
    x0: {
      ports: [2],
      type: "vprobe",
      sympySymbol: "X0",
      displayName: "X0",
    },
  };
  const values = {
    C0: 1e-12,
    L0: 1e-9,
    A0: 100,
    R0: 1000000,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["x0"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("A0*R0*(C0*L0*s**2 + 1)/(C0*L0*R0*s**2 + L0*s + R0)");
  expect(numericText).toEqual("(1.0e-13*s^2 + 100000000)/(1.0e-15*s^2 + 1.0e-9*s + 1000000)");
});
