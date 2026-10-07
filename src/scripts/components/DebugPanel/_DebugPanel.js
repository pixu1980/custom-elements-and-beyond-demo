import "./_DebugPanel.css";

import { html } from "@/core/index.js";
import { t } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { store } from "@/state/store.js";

/**
 * The live `store:change` log panel.
 */
export class CebDebugPanel extends HTMLElement {
  static name = "ceb-debug-panel";

  static {
    componentDecorator("DebugPanel", CebDebugPanel);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const language = state.preferences.language;

    const result = html`
      <section data-component="debug-panel" data-panel="debug-log" data-surface="card">
        <header data-slot="header">
          <h2>${t(language, "sections.debugLog")}</h2>
          <label data-control-group="checkline" data-density="compact">
            <input type="checkbox" .checked=${state.debug.paused} @change=${(event) => store.set("debug.paused", event.currentTarget.checked)} />
            <span>${t(language, "labels.pauseLog")}</span>
          </label>
        </header>
        <ol data-list-reset data-slot="entries">
          <for each="entry in logs">
            <li><ceb-debug-log-entry data-id="{{ entry.id }}"></ceb-debug-log-entry></li>
          </for>
        </ol>
      </section>
    `;

    result._context = { logs: state.debug.logs };

    return result;
  }
}
