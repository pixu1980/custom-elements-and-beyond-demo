import "./_StatsRow.css";

import { html } from "@/core/index.js";
import { t } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { todoSummary } from "@/state/selectors.js";

/**
 * Summary stat cards above the workspace grid.
 */
export class CebStatsRow extends HTMLElement {
  static name = "ceb-stats-row";

  static {
    componentDecorator("StatsRow", CebStatsRow);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const language = state.preferences.language;
    const summary = todoSummary(state);
    const cards = [
      { id: "total", value: summary.total, label: t(language, "stats.total") },
      { id: "open", value: summary.open, label: t(language, "stats.open") },
      { id: "done", value: summary.completed, label: t(language, "stats.done") },
      { id: "visible", value: summary.visible, label: t(language, "stats.visible") },
      { id: "selected", value: summary.selected, label: t(language, "stats.selected") },
    ];

    const result = html`
      <section aria-label=${t(language, "sections.overview")} data-component="stats-row">
        <ul data-list-reset data-slot="items">
          <for each="card in cards">
            <li>
              <article data-component="stat-card" data-surface="card">
                <strong>{{ card.value }}</strong>
                <span>{{ card.label }}</span>
              </article>
            </li>
          </for>
        </ul>
      </section>
    `;

    result._context = { cards };

    return result;
  }
}
