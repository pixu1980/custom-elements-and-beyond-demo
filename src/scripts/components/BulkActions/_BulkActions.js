import "./_BulkActions.css";

import { html } from "@/core/index.js";
import { clearSelection, deleteCompleted, deleteSelected, selectAllVisible, toggleAllSelected } from "@/helpers/actions/index.js";
import { t } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";

/** Map of declarative `data-action` values to bulk operations. */
const BULK_ACTIONS = {
  "select-visible": selectAllVisible,
  "clear-selection": clearSelection,
  "complete-selected": () => toggleAllSelected(true),
  "reopen-selected": () => toggleAllSelected(false),
  "delete-selected": deleteSelected,
  "delete-completed": deleteCompleted,
};

/**
 * Bulk action controls operating on the current selection.
 */
export class CebBulkActions extends HTMLElement {
  static name = "ceb-bulk-actions";

  static events = {
    "ceb:action": function (event) {
      const handler = BULK_ACTIONS[event.detail.action];

      handler?.();
    },
  };

  static {
    componentDecorator("BulkActions", CebBulkActions);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const language = state.preferences.language;

    return html`
      <section data-component="bulk-actions" data-panel="bulk-actions" data-surface="card">
        <h2>${t(language, "sections.bulkActions")}</h2>
        <menu data-list-reset data-slot="actions-grid">
          <li>
            <button is="ceb-button" data-action="select-visible">${t(language, "buttons.selectVisible")}</button>
          </li>
          <li>
            <button is="ceb-button" data-action="clear-selection" data-variant="secondary">${t(language, "buttons.clearSelection")}</button>
          </li>
          <li>
            <button is="ceb-button" data-action="complete-selected">${t(language, "buttons.completeSelected")}</button>
          </li>
          <li>
            <button is="ceb-button" data-action="reopen-selected" data-variant="secondary">${t(language, "buttons.reopenSelected")}</button>
          </li>
          <li>
            <button is="ceb-button" data-action="delete-selected" data-variant="danger">${t(language, "buttons.deleteSelected")}</button>
          </li>
          <li>
            <button is="ceb-button" data-action="delete-completed" data-variant="danger">${t(language, "buttons.deleteCompleted")}</button>
          </li>
        </menu>
      </section>
    `;
  }
}
