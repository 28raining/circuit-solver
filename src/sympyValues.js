import { units } from "./common.js";
import { typesWithValueUnit } from "./componentNaming.js";

/** Groups sympy names to sorted numeric shape ids (value-bearing types only). */
export function sympyNameGroupsForValueTypes(componentMap) {
  const valueTypes = new Set(typesWithValueUnit());
  const bySym = {};
  for (const id of Object.keys(componentMap)) {
    const el = componentMap[id];
    if (!el || !valueTypes.has(el.type)) continue;
    const n = el.sympyName;
    if (!bySym[n]) bySym[n] = [];
    bySym[n].push(Number(id));
  }
  for (const k of Object.keys(bySym)) {
    bySym[k].sort((a, b) => a - b);
  }
  return bySym;
}

/** True if this id should show value/unit (canonical row for shared sympy name). */
export function isCanonicalValueRow(id, componentMap, groups) {
  const el = componentMap[String(id)];
  if (!el) return true;
  const valueTypes = new Set(typesWithValueUnit());
  if (!valueTypes.has(el.type)) return true;
  const g = groups[el.sympyName];
  if (!g || g.length <= 1) return true;
  return Number(id) === g[0];
}

/** One numeric value per SymPy symbol for subs() / numeric TF. */
export function buildComponentValuesForSympy(componentValues, componentMap) {
  const groups = sympyNameGroupsForValueTypes(componentMap);
  const solved = {};
  for (const sym of Object.keys(groups)) {
    const canon = String(groups[sym][0]);
    const row = componentValues[canon];
    if (row) {
      solved[sym] = row.value * units[row.type][row.unit];
    }
  }
  return solved;
}
