/** @returns {string} */
export function newCircuitId() {
  return crypto.randomUUID();
}

/**
 * Ensure every schematic shape with connectors has a stable circuitId.
 * Vin / iin / gnd use fixed ids so driver checks stay simple.
 * @param {object} state visiojs schematic state (mutates shapes in place)
 */
export function ensureCircuitIds(state) {
  if (!state?.shapes) return state;
  for (const s of state.shapes) {
    if (s == null || !("connectors" in s)) continue;
    if (s.circuitId) continue;
    if (s.image === "vin.svg") s.circuitId = "vin";
    else if (s.image === "iin.svg") s.circuitId = "iin";
    else if (s.image === "gnd.svg") s.circuitId = "gnd";
    else s.circuitId = newCircuitId();
  }
  return state;
}

/**
 * Produce a valid Python / SymPy identifier from a display name.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeForSymPy(text) {
  const t = String(text ?? "").trim();
  if (!t) return "unnamed";
  let s = t.replace(/[^0-9a-zA-Z_]/g, "_");
  if (/^[0-9]/.test(s)) s = `_${s}`;
  if (!s) return "unnamed";
  return s;
}

/**
 * If the same sanitized label is used on different element types, disambiguate sympy symbols.
 * Same type + same label shares one symbol.
 * @param {Record<string, { type: string, displayName?: string, sympySymbol?: string }>} fullyConnectedComponents
 */
export function assignSympySymbols(fullyConnectedComponents) {
  const entries = Object.entries(fullyConnectedComponents);
  for (const [, el] of entries) {
    el.sympySymbol = sanitizeForSymPy(el.displayName ?? "");
  }
  const byBase = new Map();
  for (const [, el] of entries) {
    const b = el.sympySymbol;
    if (!byBase.has(b)) byBase.set(b, new Set());
    byBase.get(b).add(el.type);
  }
  for (const [, el] of entries) {
    if (byBase.get(el.sympySymbol).size > 1) {
      const safeType = String(el.type).replace(/[^0-9a-zA-Z_]/g, "_");
      el.sympySymbol = `${sanitizeForSymPy(el.displayName)}__${safeType}`;
    }
  }
}
