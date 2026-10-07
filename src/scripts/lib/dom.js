/**
 * Small DOM helpers shared by the components.
 */
import { store } from "@/state/store.js";

/**
 * Apply store or data values to `<select>` elements.
 *
 * A select's `value` can only be set once its `<option>` children exist, so the
 * declarative `value=` attribute cannot drive it. Components call this from
 * `afterRender()`.
 *
 * - `select[data-bind="path"]` reads the value from the store.
 * - `select[data-value="..."]` reads a literal value (e.g. a per-item field).
 *
 * `ceb-category-select` manages its own value (it renders its options).
 * @param {ParentNode} root
 * @returns {void}
 */
export function syncSelects(root) {
  for (const select of root.querySelectorAll("select[data-bind], select[data-value]:not([is='ceb-category-select'])")) {
    const value = select.dataset.bind ? store.get(select.dataset.bind) : select.dataset.value;

    if (select.value !== String(value ?? "")) {
      select.value = String(value ?? "");
    }
  }
}
