import { store } from "../shared/index.js";
import { visibleTodos } from "@/state/selectors.js";

/**
 * Selects the todos currently visible in the filtered list.
 * @returns {void}
 */
export function selectAllVisible() {
  const ids = new Set(visibleTodos(store.snapshot()).map((todo) => todo.id));

  store.state.todos = store.state.todos.map((todo) => ({
    ...todo,
    selected: ids.has(todo.id) || todo.selected,
  }));
}
