import { html } from "@/core/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { categoryChoices } from "@/state/selectors.js";

/**
 * Customized built-in `<select is="ceb-category-select">` that renders the
 * store categories and reflects its `data-value` as the selected option.
 */
export class CebCategorySelect extends HTMLSelectElement {
  static name = "ceb-category-select";
  static extends = "select";

  static attributes = {
    "data-value": function () {
      if (this._onStoreChange) {
        this.update();
      }
    },
  };

  static {
    componentDecorator("CategorySelect", CebCategorySelect);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const result = html`
      <for each="category in categories">
        <option value="{{ category }}">{{ category }}</option>
      </for>
    `;

    result._context = { categories: categoryChoices(state) };

    return result;
  }

  /** Apply the data-value once the options exist. */
  afterRender() {
    const value = this.dataset.value ?? "";

    if (this.value !== value) {
      this.value = value;
    }
  }
}
