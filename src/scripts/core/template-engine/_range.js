// @ts-check
/**
 * @module core/template-engine/_range
 * DOM range helpers: clearing, moving and normalizing values between two
 * comment markers.
 */

/**
 * Remove every sibling between `start` and `end` (exclusive).
 * @param {Node} start
 * @param {Node} end
 */
export function clearRange(start, end) {
  let current = start.nextSibling;
  while (current && current !== end) {
    const next = current.nextSibling;
    current.remove();
    current = next;
  }
}

/**
 * Move the node range `[start..end]` (inclusive) before `ref`.
 * @param {Node} start
 * @param {Node} end
 * @param {Node} ref
 */
export function moveRangeBefore(start, end, ref) {
  const fragment = document.createDocumentFragment();
  /** @type {Node | null} */
  let current = start;
  while (current) {
    const next = /** @type {Node | null} */ (current.nextSibling);
    fragment.append(current);
    if (current === end) break;
    current = next;
  }
  ref.parentNode?.insertBefore(fragment, ref);
}

/**
 * True when the `[start..end]` range sits immediately before `ref`.
 * @param {Node} start
 * @param {Node} end
 * @param {Node} ref
 * @returns {boolean}
 */
export function isRangeBeforeReference(start, end, ref) {
  /** @type {Node | null} */
  let current = start;
  while (current) {
    if (current === ref) return false;
    if (current === end) return current.nextSibling === ref;
    current = current.nextSibling;
  }
  return false;
}

/**
 * Convert an interpolated value into renderable DOM.
 * @param {unknown} value
 * @param {boolean} [useRaw] When true, strings are parsed as HTML.
 * @returns {Node}
 */
export function normalizeExprValue(value, useRaw) {
  if (value == null) return document.createTextNode("");
  if (value instanceof Node) return value;
  if (useRaw && typeof value === "string") {
    const template = document.createElement("template");
    template.innerHTML = value;
    const fragment = document.createDocumentFragment();
    while (template.content.firstChild) fragment.append(template.content.firstChild);
    return fragment;
  }
  return document.createTextNode(String(value));
}

/**
 * Infer the bound property of a form control for `model` bindings.
 * @param {Element} el
 * @returns {string} `'checked'` for checkboxes, `'value'` otherwise.
 */
export function inferModelProperty(el) {
  return el instanceof HTMLInputElement && el.type === "checkbox" ? "checked" : "value";
}
