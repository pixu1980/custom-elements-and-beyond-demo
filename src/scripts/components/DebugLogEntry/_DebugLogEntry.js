import "./_DebugLogEntry.css";

import { html } from "@/core/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";

/**
 * A single immutable store change entry, bound to a log id via `data-id`.
 */
export class CebDebugLogEntry extends HTMLElement {
  static name = "ceb-debug-log-entry";

  static attributes = {
    "data-id": function () {
      if (this._onStoreChange) {
        this.update();
      }
    },
  };

  static {
    componentDecorator("DebugLogEntry", CebDebugLogEntry);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html> | null}
   */
  render(state) {
    const entry = state.debug.logs.find((item) => item.id === this.dataset.id);

    if (!entry) {
      return null;
    }

    const payload = JSON.stringify({ oldValue: entry.oldValue, newValue: entry.newValue }, null, 2);

    return html`
      <article data-component="debug-log-entry">
        <header data-slot="entry-header">
          <strong>${entry.path || "(root)"}</strong>
          <time>${entry.timestamp}</time>
        </header>
        <pre>${payload}</pre>
      </article>
    `;
  }
}
