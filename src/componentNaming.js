/** Single-letter prefix for each component type (SymPy symbol names). */
export const typeToPrefix = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  vcvs: "A",
  vcis: "G",
  opamp: "U",
  vprobe: "X",
  iprobe: "Y",
};

/** Strip characters that are not valid in SymPy identifiers we generate (ASCII letter, digit, underscore). */
export function sanitizeSymPyIdentifierTail(raw) {
  if (!raw) return "";
  return String(raw).replace(/[^A-Za-z0-9_]/g, "");
}

/**
 * Ensure label matches type prefix and is safe for SymPy.
 * @param {string} type - component type (e.g. resistor)
 * @param {string} input - user or label text
 * @param {number} [shapeId] - fallback suffix if body empty
 */
export function commitLabelForType(type, input, shapeId = 0) {
  const prefix = typeToPrefix[type];
  if (!prefix) {
    if (type === "vin") return "vin";
    if (type === "iin") return "iin";
    if (type === "gnd") return "gnd";
    return "";
  }
  let s = sanitizeSymPyIdentifierTail(input ?? "");
  if (s.length === 0) return prefix + String(shapeId);
  if (!s.startsWith(prefix)) {
    s = prefix + s.replace(/^[A-Za-z_]+/, "");
  }
  let tail = sanitizeSymPyIdentifierTail(s.slice(prefix.length));
  if (tail.length === 0) tail = String(shapeId);
  return prefix + tail;
}

/**
 * Default next label R0, R1, … from existing sympy names of this type.
 */
export function nextDefaultLabel(type, existingSympyNames) {
  const prefix = typeToPrefix[type];
  if (!prefix) return "";
  const nums = [];
  for (const name of existingSympyNames) {
    if (!name || !name.startsWith(prefix)) continue;
    const tail = name.slice(prefix.length);
    if (/^\d+$/.test(tail)) nums.push(Number(tail));
  }
  const next = nums.length === 0 ? 0 : Math.max(...nums) + 1;
  return prefix + next;
}

export function typesWithValueUnit() {
  return ["resistor", "capacitor", "inductor", "vcvs", "vcis"];
}
