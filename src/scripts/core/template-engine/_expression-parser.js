// @ts-check
/**
 * @module core/template-engine/_expression-parser
 * `{{ expr | filter:arg }}` expression parsing and evaluation.
 */

import { FILTERS } from "./_filters.js";

/**
 * Parsed expression: a variable path plus an ordered filter pipeline.
 * @typedef {object} ParsedExpression
 * @property {string} variable Dot-path read from the context.
 * @property {Array<{ name: string, args: unknown[] }>} filters Filter pipeline.
 */

/**
 * Parse a `{{ }}` expression body into a variable + filter pipeline.
 * @param {string} expr Raw expression text (without the braces).
 * @returns {ParsedExpression}
 * @example
 * parseExpression('title | upper')        // { variable: 'title', filters: [{ name: 'upper', args: [] }] }
 * parseExpression('date | date:YYYY-MM-DD')
 */
export function parseExpression(expr) {
  const trimmed = expr.trim();
  const pipes = trimmed.split("|").map((s) => s.trim());
  const variable = pipes[0];
  const filters = pipes.slice(1).map((filterText) => {
    const fnMatch = filterText.match(/^([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)$/);
    if (fnMatch) {
      const args = fnMatch[2].trim() ? fnMatch[2].split(",").map((a) => parseArg(a.trim())) : [];
      return { name: fnMatch[1], args };
    }
    const parts = filterText.split(":").map((s) => s.trim());
    return { name: parts[0], args: parts.slice(1).map(parseArg) };
  });
  return { variable, filters };
}

/**
 * Parse a literal argument: quoted strings, numbers, booleans, else raw text.
 * @param {string} value
 * @returns {unknown}
 */
export function parseArg(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

/**
 * Read a value from an object via a dot-path (bracket indices supported).
 * @param {object | undefined | null} obj
 * @param {string} path
 * @returns {unknown}
 * @example
 * getFromPath({ a: { b: [10, 20] } }, 'a.b[1]') // → 20
 */
export function getFromPath(obj, path) {
  if (!path || !obj) return undefined;
  /** @type {Record<string, unknown> | undefined} */
  let current = /** @type {Record<string, unknown>} */ (obj);
  for (const key of path.replace(/\[(\d+)\]/g, ".$1").split(".")) {
    if (current == null) return undefined;
    current = /** @type {Record<string, unknown> | undefined} */ (current[key]);
  }
  return current;
}

/**
 * Evaluate a parsed expression against a context object.
 * @param {ParsedExpression} parsed
 * @param {object} ctx Data context.
 * @returns {unknown}
 */
export function evaluateExpression(parsed, ctx) {
  let value = getFromPath(ctx, parsed.variable);
  for (const filter of parsed.filters) {
    const fn = FILTERS[filter.name];
    if (fn) value = fn(value, ...filter.args);
  }
  return value;
}
