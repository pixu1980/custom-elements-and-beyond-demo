import "./_Header.css";

import { html } from "@/core/index.js";
import { colorSchemeOptions, languageOptions, themeOptions } from "@/helpers/index.js";
import { t } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { syncSelects } from "@/lib/dom.js";
import { store } from "@/state/store.js";

/** Store paths bound by the header selects. */
const SELECT_PATHS = {
  "preferences.colorScheme": "preferences.colorScheme",
  "preferences.theme": "preferences.theme",
  "preferences.language": "preferences.language",
};

/**
 * Hero header and top level demo actions.
 */
export class CebHeader extends HTMLElement {
  static name = "ceb-header";

  static {
    componentDecorator("Header", CebHeader);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const language = state.preferences.language;

    return html`
      <header data-component="header" data-surface="card">
        <section data-slot="copy">
          <p data-text="eyebrow">${t(language, "app.eyebrow")}</p>
          <h1>${t(language, "app.title")}</h1>
          <p data-text="subcopy">${t(language, "app.subcopyPrimary")}</p>
          <p data-text="subcopy">${t(language, "app.subcopySecondary")}</p>
        </section>

        <section data-slot="toolbar">
          <menu data-list-reset data-slot="actions">
            <li>
              <button is="ceb-button" data-action="reset" data-variant="warning">${t(language, "buttons.resetDemo")}</button>
            </li>
            <li>
              <button is="ceb-button" data-action="new-todo">${t(language, "buttons.newTodo")}</button>
            </li>
            <li>
              <button is="ceb-button" data-action="new-category" data-variant="secondary">${t(language, "buttons.newCategory")}</button>
            </li>
          </menu>

          <section data-slot="preferences">
            <label data-field>
              <span>${t(language, "fields.colorScheme")}</span>
              <select data-bind="preferences.colorScheme" @change=${this.handlePreference}>
                ${colorSchemeOptions()}
              </select>
            </label>

            <label data-field>
              <span>${t(language, "fields.theme")}</span>
              <select data-bind="preferences.theme" @change=${this.handlePreference}>
                ${themeOptions()}
              </select>
            </label>

            <label data-field>
              <span>${t(language, "fields.language")}</span>
              <select data-bind="preferences.language" @change=${this.handlePreference}>
                ${languageOptions()}
              </select>
            </label>
          </section>
        </section>
      </header>
    `;
  }

  /** Apply the select values once their options exist. */
  afterRender() {
    syncSelects(this);
  }

  /**
   * Write a preference select back to the store.
   * @param {Event} event
   */
  handlePreference(event) {
    const select = /** @type {HTMLSelectElement} */ (event.currentTarget);
    const path = select.dataset.bind;

    if (path && path in SELECT_PATHS) {
      store.set(path, select.value);
    }
  }
}
