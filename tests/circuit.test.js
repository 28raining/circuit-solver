// const { calculateImpedance } = require('../src/impedanceFunctions.js');
import { expect, test } from "vitest";
import { initPyodideAndSympy } from "./../src/pyodideLoader.js";
import { build_and_solve_mna, new_calculate_tf } from "../src/new_solveMNA.js";

const pyodide = await initPyodideAndSympy();

test("voltage in current probe - 1", async () => {
  const components = {
    1: { id: 1, ports: [0, 1], type: "iprobe", sympyName: "Y0" },
    2: { id: 2, ports: [0], type: "vin", sympyName: "vin" },
    3: { id: 3, ports: [0, 2], type: "inductor", sympyName: "L0" },
    4: { id: 4, ports: [1, 2], type: "resistor", sympyName: "R0" },
    5: { id: 5, ports: [2, null], type: "capacitor", sympyName: "C0" },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["1"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  // expect(_mathml).toEqual(null);
  // expect(complex_response).toEqual("1.0e-24*s**2/sqrt(1.0e-40*s**4 - 1.0e-20*s**2 + 1)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});

/** Disconnected extra capacitor on schematic: values include C1 but MNA/symbol solve only has C0,L0,R0 — must not NameError on subs. */
test("numeric TF ignores extra component values not in symbolic result", async () => {
  const components = {
    1: { id: 1, ports: [0, 1], type: "iprobe", sympyName: "Y0" },
    2: { id: 2, ports: [0], type: "vin", sympyName: "vin" },
    3: { id: 3, ports: [0, 2], type: "inductor", sympyName: "L0" },
    4: { id: 4, ports: [1, 2], type: "resistor", sympyName: "R0" },
    5: { id: 5, ports: [2, null], type: "capacitor", sympyName: "C0" },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
    C1: 1e-12,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["1"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});

test("voltage in current probe - 2", async () => {
  const components = {
    1: { id: 1, ports: [0, 1], type: "resistor", sympyName: "R0" },
    2: { id: 2, ports: [0], type: "vin", sympyName: "vin" },
    3: { id: 3, ports: [0, 2], type: "inductor", sympyName: "L0" },
    4: { id: 4, ports: [1, 2], type: "iprobe", sympyName: "Y0" },
    5: { id: 5, ports: [2, null], type: "capacitor", sympyName: "C0" },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["4"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("C0*L0*s**2/(C0*L0*R0*s**2 + L0*s + R0)");
  // expect(_mathml).toEqual(null);
  // expect(complex_response).toEqual("1.0e-24*s**2/sqrt(1.0e-40*s**4 - 1.0e-20*s**2 + 1)");
  expect(numericText).toEqual("1.0e-20*s^2/(1.0e-16*s^2 + 1.0e-6*s + 10000)");
});
test("voltage in current probe - 3", async () => {
  const components = {
    1: { id: 1, ports: [0, 1], type: "resistor", sympyName: "R0" },
    2: { id: 2, ports: [0], type: "vin", sympyName: "vin" },
    3: { id: 3, ports: [0, 2], type: "inductor", sympyName: "L0" },
    4: { id: 4, ports: [2, null], type: "iprobe", sympyName: "Y0" },
    5: { id: 5, ports: [2, null], type: "capacitor", sympyName: "C0" },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["4"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("1/(L0*s)");
  expect(numericText).toEqual("1000000.0/s");
});

test("current in current probe - 2", async () => {
  const components = {
    1: { id: 1, ports: [0, 2], type: "inductor", sympyName: "L0" },
    2: { id: 2, ports: [0], type: "iin", sympyName: "iin" },
    3: { id: 3, ports: [0, 1], type: "iprobe", sympyName: "Y0" },
    4: { id: 4, ports: [1, 2], type: "resistor", sympyName: "R0" },
    5: { id: 5, ports: [2, null], type: "capacitor", sympyName: "C0" },
  };
  const values = {
    L0: 0.000001,
    R0: 10000,
    C0: 1.0000000000000002e-14,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["3"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("L0*s/(L0*s + R0)");
  // expect(_mathml).toEqual(null);
  // expect(complex_response).toEqual("1.0e-10*s/sqrt(1.0e-20*s**2 + 1)");
  expect(numericText).toEqual("1.0e-6*s/(1.0e-6*s + 10000)");
});

test("current in current probe VCIS - 3", async () => {
  const components = {
    1: { id: 1, ports: [null, 0, 1, null], type: "vcis", sympyName: "G0" },
    2: { id: 2, ports: [0, null], type: "resistor", sympyName: "R0" },
    3: { id: 3, ports: [0, 1], type: "iprobe", sympyName: "Y0" },
    4: { id: 4, ports: [0], type: "iin", sympyName: "iin" },
  };
  const values = {
    G0: 0.001,
    R0: 1000000,
  };
  const [textResult, _mathml] = await build_and_solve_mna(2, ["3"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("G0*R0/(G0*R0 + 1)");
  // expect(_mathml).toEqual(null);
  // expect(complex_response).toEqual("0.999000999000999");
  expect(numericText).toEqual("0.999000999000999");
});

test("voltage in voltage probe VCVS", async () => {
  const components = {
    1: { id: 1, ports: [1, 0], type: "capacitor", sympyName: "C0" },
    2: { id: 2, ports: [0, 1], type: "inductor", sympyName: "L0" },
    3: { id: 3, ports: [0], type: "vin", sympyName: "vin" },
    4: { id: 4, ports: [null, 1, 2, null], type: "vcvs", sympyName: "A0" },
    5: { id: 5, ports: [1, null], type: "resistor", sympyName: "R0" },
    6: { id: 6, ports: [2], type: "vprobe", sympyName: "X0" },
  };
  const values = {
    C0: 1e-12,
    L0: 1e-9,
    A0: 100,
    R0: 1000000,
  };
  const [textResult, _mathml] = await build_and_solve_mna(3, ["6"], components, values, pyodide);
  const { numericText } = await new_calculate_tf(pyodide, { fmin: 1, fmax: 1000 }, 10, values, () => {});
  expect(textResult).toEqual("A0*R0*(C0*L0*s**2 + 1)/(C0*L0*R0*s**2 + L0*s + R0)");
  // expect(_mathml).toEqual(null);
  // expect(complex_response).toEqual("Abs(1.0e-13*s**2 - 100000000)/(1000000*sqrt(1.0e-42*s**4 - 1.999999999e-21*s**2 + 1))"); //FIXME - this seems to be a sympy bug
  expect(numericText).toEqual("(1.0e-13*s^2 + 100000000)/(1.0e-15*s^2 + 1.0e-9*s + 1000000)");
});
