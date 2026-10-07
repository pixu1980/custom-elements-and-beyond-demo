/**
 * Pure derived selectors. They replace the signal based `computed` helpers of
 * the reactive talk: given a store snapshot they return the values the views
 * need, without any reactivity primitive.
 */
import { pipelineTodos } from "@/data/index.js";

/** @typedef {import("@/data/_data.js").DemoState} DemoState */
/** @typedef {import("@/data/_data.js").TodoItem} TodoItem */

/**
 * Todos after filters and sorting are applied.
 * @param {DemoState} state
 * @returns {TodoItem[]}
 */
export function visibleTodos(state) {
  return pipelineTodos(state.todos, state.filters, state.preferences.language);
}

/**
 * Aggregated counters used by the stat cards and list labels.
 * @param {DemoState} state
 * @returns {{ total: number, completed: number, open: number, selected: number, visible: number }}
 */
export function todoSummary(state) {
  let completed = 0;
  let selected = 0;

  for (const todo of state.todos) {
    if (todo.completed) {
      completed += 1;
    }

    if (todo.selected) {
      selected += 1;
    }
  }

  return {
    total: state.todos.length,
    completed,
    open: state.todos.length - completed,
    selected,
    visible: visibleTodos(state).length,
  };
}

/**
 * Category values offered by editors.
 * @param {DemoState} state
 * @returns {string[]}
 */
export function categoryChoices(state) {
  return state.categories;
}

/**
 * Category values offered by filters, including the `all` token.
 * @param {DemoState} state
 * @returns {string[]}
 */
export function categoryOptions(state) {
  return ["all", ...state.categories];
}

/**
 * Debug log entries shown in the side panel.
 * @param {DemoState} state
 * @returns {import("@/data/_data.js").DebugLogEntry[]}
 */
export function debugLogs(state) {
  return state.debug.logs;
}
