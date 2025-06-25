export const initialState = {
  settings: {
    defaultZoom: 0.75,
    gridSize: 32,
    width: 2432,
    height: 1792,
    maxZoom: 2,
  },
  shapes: [
    {
      image: "origin.svg",
      x: 0,
      y: 0,
      fixed: true,
      offset: [-32, -32],
    },
    {
      image: "gnd.svg",
      connectors: [[0, 0]],
      x: 192,
      y: 128,
      offset: [-100, -180],
    },
    {
      image: "vin.svg",
      connectors: [[0, 0]],
      x: -192,
      y: 0,
      offset: [-64, 0],
    },
    {
      image: "inductor.svg",
      connectors: [
        [-64, 0],
        [64, 0],
      ],
      x: -96,
      y: -64,
      label: {
        text: "L0",
        class: "circuit_label",
        x: 0,
        y: -30,
      },
      offset: [-80, -64],
    },
    {
      image: "resistor.svg",
      connectors: [
        [-32, 0],
        [64, 0],
      ],
      x: 64,
      y: -64,
      label: {
        text: "R0",
        class: "circuit_label",
        x: 16,
        y: -36,
      },
      offset: [-48, -48],
    },
    {
      image: "capacitor.svg",
      connectors: [
        [0, -32],
        [0, 64],
      ],
      x: 192,
      y: 32,
      label: {
        text: "C0",
        class: "circuit_label",
        x: -28,
        y: 0,
      },
      offset: [-48, -64],
    },
    {
      image: "vprobe.svg",
      connectors: [[0, 0]],
      x: 0,
      y: -160,
      offset: [-10, -90],
      label: {
        text: "X0",
        class: "circuit_label",
        x: 0,
        y: -30,
      },
    },
  ],
  wires: [
    {
      start: {
        connectorID: 0,
        shapeID: 1,
      },
      end: {
        shapeID: 5,
        connectorID: 1,
      },
      points: [],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 5,
      },
      end: {
        shapeID: 4,
        connectorID: 1,
      },
      points: [[192, -64]],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 4,
      },
      end: {
        shapeID: 3,
        connectorID: 1,
      },
      points: [],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 3,
      },
      end: {
        shapeID: 2,
        connectorID: 0,
      },
      points: [[-192, -64]],
    },
    {
      start: {
        connectorID: 0,
        shapeID: 6,
      },
      end: {
        shapeID: 3,
        connectorID: 1,
      },
      points: [[0, -64]],
    },
  ],
};
