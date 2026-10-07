import "./_TodoList.css";

import { html } from "@/core/index.js";
import { t, visibleSummaryLabel } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { visibleTodos } from "@/state/selectors.js";

/**
 * The central todo list with its live visibility label and empty state.
 */
export class CebTodoList extends HTMLElement {
  static name = "ceb-todo-list";

  static {
    componentDecorator("TodoList", CebTodoList);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html>}
   */
  render(state) {
    const language = state.preferences.language;
    const todos = visibleTodos(state);

    const result = html`
      <section data-component="todo-list">
        <header data-slot="header">
          <h2>${t(language, "sections.reactiveList")}</h2>
          <p data-slot="summary">${visibleSummaryLabel(language, todos.length, state.filters.sortBy)}</p>
        </header>
        <if condition="isEmpty">
          <p data-slot="empty">Nothing matches the current filters yet.</p>
        </if>
        <ol data-list-reset data-slot="items">
          <for each="todo in todos">
            <li data-component="todo-entry"><ceb-todo-item data-id="{{ todo.id }}"></ceb-todo-item></li>
          </for>
        </ol>
      </section>
    `;

    result._context = { isEmpty: todos.length === 0, todos };

    return result;
  }
}
