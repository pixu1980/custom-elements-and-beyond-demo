import "./_Filters.css";

import { html } from "@/core/index.js";
import { categoryFilterOptions, directionOptions, priorityFilterOptions, sortByOptions, statusOptions } from "@/helpers/index.js";
import { t } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { syncSelects } from "@/lib/dom.js";
import { store } from "@/state/store.js";

/**
 * Filter and sorting controls that drive the visible list pipeline.
 */
export class CebFilters extends HTMLElement {
  static name = "ceb-filters";

  static events = {
    submit: function (event) {
      event.preventDefault();
    },
  };

  static {
    componentDecorator("Filters", CebFilters);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const language = state.preferences.language;

    return html`
      <section data-component="filters" data-panel="filters" data-surface="card">
        <h2>${t(language, "sections.filtersSorting")}</h2>
        <form data-slot="form">
          <label data-field>
            <span>${t(language, "fields.search")}</span>
            <input value="${state.filters.search}" placeholder="${t(language, "placeholders.search")}" @input=${(event) => store.set("filters.search", event.currentTarget.value)} />
          </label>
          <section data-layout="pair-grid" data-slot="primary-filters">
            <label data-field>
              <span>${t(language, "fields.status")}</span>
              <select data-bind="filters.status" @change=${this.handleFilter}>
                ${statusOptions()}
              </select>
            </label>
            <label data-field>
              <span>${t(language, "fields.category")}</span>
              <select data-bind="filters.category" @change=${this.handleFilter}>
                ${categoryFilterOptions()}
              </select>
            </label>
          </section>
          <section data-layout="pair-grid" data-slot="secondary-filters">
            <label data-field>
              <span>${t(language, "fields.priority")}</span>
              <select data-bind="filters.priority" @change=${this.handleFilter}>
                ${priorityFilterOptions()}
              </select>
            </label>
            <label data-field>
              <span>${t(language, "fields.sortBy")}</span>
              <select data-bind="filters.sortBy" @change=${this.handleFilter}>
                ${sortByOptions()}
              </select>
            </label>
          </section>
          <label data-field>
            <span>${t(language, "fields.direction")}</span>
            <select data-bind="filters.sortDir" @change=${this.handleFilter}>
              ${directionOptions()}
            </select>
          </label>
        </form>
      </section>
    `;
  }

  /** Apply the select values once their options exist. */
  afterRender() {
    syncSelects(this);
  }

  /**
   * Write a filter select back to the store.
   * @param {Event} event
   */
  handleFilter(event) {
    const select = /** @type {HTMLSelectElement} */ (event.currentTarget);

    if (select.dataset.bind) {
      store.set(select.dataset.bind, select.value);
    }
  }
}
