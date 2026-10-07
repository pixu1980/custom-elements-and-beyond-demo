// @ts-check
/**
 * @module core/template-engine/_template-helpers
 * The `html` tagged-template helper, directives and the directive brand.
 */

const directiveBrand = Symbol("directive");

/**
 * Template result produced by {@link html}.
 * @typedef {object} TemplateResult
 * @property {'template-result'} kind
 * @property {TemplateStringsArray} strings
 * @property {unknown[]} values
 * @property {object} [_context] Data context enabling `{{ }}` expressions.
 */

/**
 * Repeat directive payload.
 * @typedef {object} RepeatPayload
 * @property {unknown} items Collection or signal of a collection.
 * @property {(item: unknown, index: number) => string | number} key
 * @property {(item: unknown, index: number) => unknown} renderItem
 */

/**
 * @typedef {object} Directive
 * @property {string} name Directive name.
 * @property {unknown} payload Directive configuration.
 */

/**
 * Create a branded directive value.
 * @param {string} name
 * @param {unknown} payload
 * @returns {Directive & Record<symbol, unknown>}
 */
export function directive(name, payload) {
  return { [directiveBrand]: true, name, payload };
}

/**
 * Narrowing guard for directives.
 * @param {unknown} value
 * @param {string} [name] Optional directive name to match.
 * @returns {value is Directive}
 */
export function isDirective(value, name) {
  const record = value && typeof value === "object" ? /** @type {Record<PropertyKey, unknown>} */ (value) : null;
  return Boolean(record && record[directiveBrand] === true && (!name || record.name === name));
}

/**
 * Template result: a tagged-template payload to be rendered by {@link render}.
 *
 * Not a real DOM template - packages the static string chunks and the
 * interpolated values. Two expression systems:
 * - `${expr}` - JS values (handlers, signals, iterables, directives)
 * - `{{ expr }}` - data expressions with filter pipes
 *
 * @param {TemplateStringsArray} strings Static string chunks.
 * @param {unknown[]} values Interpolated values.
 * @returns {{ kind: 'template-result', strings: TemplateStringsArray, values: unknown[] }}
 */
export function html(strings, ...values) {
  return { kind: "template-result", strings, values };
}

/**
 * Two-way binding directive for form controls.
 *
 * @param {{
 *   get: () => unknown,
 *   set: (value: unknown) => void,
 *   event?: string,
 *   prop?: string,
 * }} config Binding config. `get`/`set` drive the value; an optional `signal`
 * @returns {Directive}
 * @example
 * html`<input model=${{ get: () => store.state.name, set: (v) => { store.state.name = v; } }} />`
 */
export function model(config) {
  return directive("model", config);
}

/**
 * Repeat directive: keyed reconciliation over a collection.
 * @param {unknown} items Collection or signal of a collection.
 * @param {(item: unknown, index: number) => string | number} key Stable key fn.
 * @param {(item: unknown, index: number) => unknown} renderItem Item renderer.
 * @returns {Directive}
 */
export function repeat(items, key, renderItem) {
  return directive("repeat", { items, key, renderItem });
}
