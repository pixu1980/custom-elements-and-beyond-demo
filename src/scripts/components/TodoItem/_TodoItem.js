import "./_TodoItem.css";

import { html } from "@/core/index.js";
import { getTodoById, removeTodo, updateTodo } from "@/helpers/actions/index.js";
import { priorityOptions } from "@/helpers/index.js";
import { optionLabel, t } from "@/i18n/index.js";
import { componentDecorator } from "@/lib/component-decorator.js";
import { syncSelects } from "@/lib/dom.js";

/**
 * A single todo card with inline editors and selection controls.
 * The `data-id` attribute binds the element to a todo in the store.
 */
export class CebTodoItem extends HTMLElement {
  static name = "ceb-todo-item";

  static attributes = {
    "data-id": function () {
      if (this._onStoreChange) {
        this.update();
      }
    },
  };

  static events = {
    "ceb:action": function (event) {
      if (event.detail.action === "remove-todo") {
        removeTodo(this.dataset.id ?? "");
      }
    },
  };

  static {
    componentDecorator("TodoItem", CebTodoItem);
  }

  /**
   * @param {import("@/data/_data.js").DemoState} state
   * @returns {ReturnType<typeof html> | null}
   */
  render(state) {
    const todo = state.todos.find((item) => item.id === this.dataset.id);

    if (!todo) {
      return null;
    }

    const language = state.preferences.language;
    const isDone = todo.completed;
    const id = todo.id;

    return html`
      <article data-component="todo-item" data-priority=${todo.priority} data-state=${isDone ? "done" : "open"}>
        <header data-slot="header">
          <label data-control-group="checkline" data-slot="selection-toggle">
            <input type="checkbox" .checked=${todo.selected} @change=${(event) => updateTodo(id, { selected: event.currentTarget.checked })} />
            <span>${t(language, "labels.select")}</span>
          </label>
          <label data-control-group="checkline" data-slot="completion-toggle">
            <input type="checkbox" .checked=${todo.completed} @change=${(event) => updateTodo(id, { completed: event.currentTarget.checked })} />
            <span>${t(language, "labels.done")}</span>
          </label>
          <input
            aria-label=${t(language, "fields.title")}
            aria-readonly=${String(isDone)}
            data-slot="title"
            value="${todo.title}"
            @input=${(event) => updateTodo(id, { title: event.currentTarget.value })}
            readonly=${isDone}
          />
        </header>

        <section data-slot="meta">
          <label data-field>
            <span>${t(language, "fields.category")}</span>
            <select is="ceb-category-select" data-value="${todo.category}" @change=${(event) => updateTodo(id, { category: event.currentTarget.value })} disabled=${isDone}></select>
          </label>
          <label data-field>
            <span>${t(language, "fields.priority")}</span>
            <select data-value="${todo.priority}" @change=${(event) => updateTodo(id, { priority: event.currentTarget.value })} disabled=${isDone}>
              ${priorityOptions()}
            </select>
          </label>
          <label data-field>
            <span>${t(language, "fields.dueDate")}</span>
            <input type="date" value="${todo.dueDate}" @change=${(event) => updateTodo(id, { dueDate: event.currentTarget.value })} disabled=${isDone} />
          </label>
        </section>

        <label data-field data-slot="notes">
          <span>${t(language, "fields.notes")}</span>
          <textarea model=${{ get: () => getTodoById(id)?.notes ?? "", set: (value) => updateTodo(id, { notes: String(value) }) }} readonly=${isDone} rows="2"></textarea>
        </label>

        <footer data-slot="footer">
          <span data-component="priority-chip" data-priority=${todo.priority}>${optionLabel(language, "priority", todo.priority)}</span>
          <button is="ceb-button" data-action="remove-todo" data-variant="danger">${t(language, "buttons.delete")}</button>
        </footer>
      </article>
    `;
  }

  /** Apply the per-item select values once their options exist. */
  afterRender() {
    syncSelects(this);
  }
}
