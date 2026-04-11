/** First letter of schematic labels must match these defaults (same as palette naming). */
export const COMPONENT_NAME_PREFIX = {
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  vcvs: "A",
  vcis: "G",
  opamp: "U",
  vprobe: "X",
  iprobe: "Y",
};

/**
 * Keep the type letter; user may edit the rest (e.g. R0 → Rload).
 * Wrong first character is replaced (e.g. C0 on a resistor → R0).
 * @param {string} type componentValues[].type
 * @param {string} text raw input
 * @returns {string}
 */
export function enforceComponentNamePrefix(type, text) {
  const p = COMPONENT_NAME_PREFIX[type];
  if (!p) return text;
  const s = String(text ?? "");
  if (s.length === 0) return `${p}0`;
  if (s[0] === p) return s;
  const rest = s.slice(1);
  return `${p}${rest || "0"}`;
}
