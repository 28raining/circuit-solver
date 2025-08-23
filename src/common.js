import { createTheme } from "@mui/material/styles";

export const units = {
  resistor: { mΩ: 1e-3, Ω: 1, KΩ: 1e3, MΩ: 1e6, GΩ: 1e9 },
  capacitor: { fF: 1e-15, pF: 1e-12, nF: 1e-9, uF: 1e-6, mF: 1e-3, F: 1 },
  inductor: { fH: 1e-15, pH: 1e-12, nH: 1e-9, uH: 1e-6, mH: 1e-3, H: 1 },
  frequency: { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, THz: 1e12 },
  vcvs: { "V/V": 1 },
  vcis: { "A/V": 1 },
};

export const addShapes = {
  opamp: {
    image: "opamp.svg",
    connectors: [
      [0, -32],
      [0, 32],
      [128, 0],
    ],
    x: 0,
    y: 0,
    offset: [0, -96],
    label: {
      text: "U1",
      class: "circuit_label",
      x: 96,
      y: -32,
    },
  },
  vcvs: {
    image: "vcvs.svg",
    connectors: [
      [-64, 64],
      [-64, 32],
      [0, -32],
      [0, 128],
    ],
    x: 0,
    y: 0,
    offset: [-80, -32],
    label: {
      text: "A1",
      class: "circuit_label",
      x: 48,
      y: 24,
    },
  },
  vcis: {
    image: "vcis.svg",
    connectors: [
      [-64, 64],
      [-64, 32],
      [0, -32],
      [0, 128],
    ],
    x: 0,
    y: 0,
    offset: [-80, -32],
    label: {
      text: "G1",
      class: "circuit_label",
      x: 48,
      y: 24,
    },
  },
  resistor: {
    image: "resistor.svg",
    connectors: [
      [-32, 0],
      [64, 0],
    ],
    x: 0,
    y: 0,
    label: {
      text: "R1",
      class: "circuit_label",
      x: 16,
      y: -36,
    },
    offset: [-48, -48],
  },
  capacitor: {
    image: "capacitor.svg",
    connectors: [
      [0, -32],
      [0, 64],
    ],
    x: 0,
    y: 0,
    label: {
      text: "C1",
      class: "circuit_label",
      x: -28,
      y: 0,
    },
    offset: [-48, -64],
  },
  inductor: {
    image: "inductor.svg",
    connectors: [
      [-64, 0],
      [64, 0],
    ],
    x: 0,
    y: 0,
    label: {
      text: "L1",
      class: "circuit_label",
      x: 0,
      y: -30,
    },
    offset: [-80, -64],
  },
  vin: {
    image: "vin.svg",
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-64, 0],
  },
  iin: {
    image: "iin.svg",
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-64, 0],
  },
  gnd: {
    image: "gnd.svg",
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-100, -180],
  },
  vprobe: {
    image: "vprobe.svg",
    label: {
      text: "X1",
      class: "circuit_label",
      x: 0,
      y: -30,
    },
    connectors: [[0, 0]],
    x: 0,
    y: 0,
    offset: [-10, -90],
  },
  iprobe: {
    image: "iprobe.svg",
    label: {
      text: "Y1",
      class: "circuit_label",
      x: -64,
      y: -36,
    },
    connectors: [
      [-64, 0],
      [64, 0],
    ],
    x: 0,
    y: 0,
    offset: [-96, -64],
  },
};

export const theme = createTheme({
  palette: {
    bland: {
      main: "#fff",
      light: "#dedfe0",
      dark: "#dedfe0",
      contrastText: "#242105",
    },
  },
});

export const emptyResults = { text: "", mathML: "", complexResponse: "", bilinearRaw: "", bilinearMathML: "", numericML: "", numericText: "", solver: null };
