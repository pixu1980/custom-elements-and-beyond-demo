# CONTEXT — custom-elements-and-beyond-demo

Standalone Todo demo that mirrors `reactive-apps-without-frameworks-demo`, rebuilt with **custom elements** and the **`html` template engine** instead of signals.

## What this is

- A faithful port of the reactive todo app: same store shape, same seed data, same i18n, same CSS.
- Every component is a **custom element** registered through a metadata-driven **decorator**
  in a `static {}` block (`static name`, `static extends`, `static attributes`, `static events`,
  `static live`). No component is a plain function.
  - **customized built-ins** for controls: `button is="ceb-button"` (declarative `data-action` → bubbling `ceb:action`) and `select is="ceb-category-select"`.
  - **autonomous elements** for containers: `ceb-app`, `ceb-header`, `ceb-stats-row`, `ceb-filters`, `ceb-bulk-actions`, `ceb-todo-list`, `ceb-todo-item`, `ceb-debug-panel`, `ceb-debug-log-entry`.
- **Form bindings are declarative**: `value="${...}"` + `@input`/`@change` handlers write straight to the store (`store.set`, `updateTodo`). Checkboxes use `.checked=${...}`. `<select>` values are applied in `afterRender()` (`syncSelects`) because a select can only take a value once its options exist.
- The DOM is updated exclusively through the template engine (`html`, `render`, `repeat`, `model`, `<for each="…">`, `<if condition="…">`). There is no `innerText` / `value` / `innerHTML` in the components.
- `<for>` / `<if>` are static string blocks (they use `{{ }}`); `repeat()` is used for interactive list items whose handlers must close over the item.

## Runtime architecture

```
store (Proxy) ──store:change──▶ component.update() ──render(this.render(snapshot), this)──▶ DOM parts
```

- `src/scripts/core/` — **vendored** engine from `@pix-galaxy/pix-vanilla-reactive`:
  `store/`, `template-engine/` and `disposable/`. **Signals were removed entirely**: the
  engine is store-only and commits DOM parts on demand.
- `src/scripts/core/index.js` — public surface: `Store`, `html`, `render`, `repeat`, `model`, `directive`.
- `src/scripts/state/store.js` — store singleton + localStorage persistence.
- `src/scripts/state/selectors.js` — pure derived values.
- `src/scripts/lib/component-decorator.js` — metadata-driven decorator: mixes in
  `observedAttributes`, delegated events and live rendering (no base classes).
- `src/scripts/components/` — one custom element per view, each self-registering from a
  `static {}` block.
- `src/scripts/data/`, `helpers/`, `i18n/` — reused from the reactive demo; `helpers/computed` was removed and replaced by `state/selectors.js`.

## Re-render strategy

Every element subscribes to the global `store:change` event and re-renders its own template.
The template engine diffs by part, so only the changed DOM parts are committed (no virtual DOM).

Each `<for>` block keeps a `ChildNodePart`: the engine updates the existing DOM in place, so
editing an input inside a list keeps focus, caret and form state.

## Ports

- Dev server: `pnpm dev` → `parcel src/index.html -p 6002`.
- Build: `pnpm build`.

## Status

- Implemented (full shell parity): App, Header, StatsRow, Filters, BulkActions,
  TodoList, TodoItem, DebugPanel + DebugLogEntry, CebButton.
- The store change log is fed by the `store:change` subscriber in `state/store.js`
  (capped to the latest 30 entries, pausable via `debug.paused`).
- Not in the active reference shell: TodoModal, CategoryModal, QuickAdd.

## Binding style

- No `model` directive in the components; only the notes `<textarea>` uses the inline
  `model=${{ get, set }}` form, because a textarea needs caret-safe two-way sync.
- `ceb-category-select` renders the store categories and reflects `data-value`.

## `<for>` blocks

Every list uses the inner-template form:

```html
<for each="todo in todos">
  <li data-component="todo-entry"><ceb-todo-item data-id="{{ todo.id }}"></ceb-todo-item></li>
</for>
```

This is the only `<for>` form the engine exposes: each block keeps a `ChildNodePart` and the
engine updates the existing DOM in place, so focus, caret and form state survive the re-render.

## Conventions

- Zero CSS classes in stylesheets; element + `[data-*]` attribute selectors only.
- Semantic HTML; no inline styles.
- JSDoc on exported symbols.
