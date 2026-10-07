// @ts-check
/**
 * @module core/template-engine/_inner-template
 * Shared string-template rendering for `<for>` / `<if>` block bodies.
 * Evaluates `<if condition>` and `{{ expr }}` inline against a context.
 *
 * Security: `{{ }}` values are HTML-escaped by default. Use an explicit
 * `| raw` filter on the pipeline to inject trusted HTML:
 * `{{ article.body | raw }}`.
 */

import { evaluateExpression, parseExpression } from "./_expression-parser.js";

/** @type {Record<string, string>} */
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };

/**
 * Escape a value for safe HTML text interpolation.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtmlText(value) {
  return String(value).replace(/[&<>"']/g, (s) => HTML_ESCAPES[s] ?? s);
}

/**
 * True when a parsed pipeline ends with the `raw` filter.
 * @param {import('./_expression-parser.js').ParsedExpression} parsed
 * @returns {boolean}
 */
function hasRawFilter(parsed) {
  return parsed.filters.length > 0 && parsed.filters[parsed.filters.length - 1].name === "raw";
}

/**
 * Render a block's inner template string by evaluating `<if>` conditions and
 * `{{ }}` expressions against `ctx`. `{{ }}` values are HTML-escaped unless
 * the pipeline ends with `| raw`.
 * @param {string} template Raw inner HTML template.
 * @param {object} ctx Data context.
 * @returns {string} Rendered HTML string.
 */
export function renderInnerTemplate(template, ctx) {
  let processed = template.replace(/<if\s+condition="([^"]*)">([\s\S]*?)<\/if>/gi, (_, condition, content) => {
    const value = evaluateExpression(parseExpression(condition), ctx);
    return value ? content : "";
  });
  processed = processed.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
    const parsed = parseExpression(expr);
    const value = evaluateExpression(parsed, ctx);
    if (value == null) return "";
    return hasRawFilter(parsed) ? String(value) : escapeHtmlText(value);
  });
  return processed;
}
