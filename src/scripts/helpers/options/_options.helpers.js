import { html } from "@/core/index.js";
import { store } from "@/helpers/shared/index.js";
import { categoryChoices } from "@/state/selectors.js";

/** @typedef {import("./_options.constants.js").NamedOption} NamedOption */

/**
 * Renders a static option list from name/value pairs.
 * @param {NamedOption[]} options
 * @returns {ReturnType<typeof html>}
 */
export function namedOptions(options) {
  const result = html`
    <for each="option in options">
      <option value="{{ option.value }}">{{ option.label }}</option>
    </for>
  `;

  result._context = { options };

  return result;
}

/**
 * Renders the live category options shared by filters and editors.
 * @returns {ReturnType<typeof html>}
 */
export function categoryChoiceOptions() {
  const result = html`
    <for each="category in categories">
      <option value="{{ category }}">{{ category }}</option>
    </for>
  `;

  result._context = { categories: categoryChoices(store.snapshot()) };

  return result;
}

/**
 * Returns the current UI language from persisted preferences.
 * @returns {import("@/data/_data.js").LanguageCode}
 */
export function currentLanguage() {
  return store.state.preferences.language;
}

/**
 * Creates name/value pairs from stable enum values.
 * @param {string[]} values
 * @param {(value: string) => string} getLabel
 * @returns {NamedOption[]}
 */
export function toNamedOptionList(values, getLabel) {
  return values.map((value) => ({ value, label: getLabel(value) }));
}
