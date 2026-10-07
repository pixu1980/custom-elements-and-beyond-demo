# Implementation journey

How the custom-elements port differs from the signal-based original.

## 1. Runtime

| Concern           | reactive-apps demo                               | this demo                                |
| ----------------- | ------------------------------------------------ | ---------------------------------------- |
| State             | `Store` (Proxy)                                  | `Store` (Proxy), vendored                |
| Derived values    | `Signal.Computed` + `tickState`                  | pure functions in `state/selectors.js`   |
| Reactivity bridge | `effect(() => { tickState.get(); render(...) })` | `window` `store:change` → `connectStore` |
| DOM updates       | `html` / `render` / `repeat` / `model`           | same engine, vendored                    |
| Views             | plain functions returning `html`                 | custom elements that own a `view(state)` |

## 2. Why no signals

The talk shows the store's `store:change` CustomEvent as the single notification boundary.
Derived values are plain functions over `store.snapshot()`. **Signals were removed from the
vendored engine entirely**: `src/scripts/core/signals/` no longer exists and the template
parts commit values directly (no `isSignalLike`, no subscriptions).

## 3. Element taxonomy

Every view is a custom element registered through the metadata-driven decorator in a
`static {}` block (`src/scripts/lib/component-decorator.js`). No view is a plain function.

- **Customized built-ins** for controls: `button is="ceb-button"`.
  It turns `data-action="reset"` into a bubbling `ceb:action` event, so a single
  delegated listener on `ceb-app` maps actions to store mutations.
- **Autonomous elements** for containers: `ceb-app`, `ceb-header`, `ceb-stats-row`,
  `ceb-filters`, `ceb-todo-list`, `ceb-todo-item`.
- The decorator mixes in `observedAttributes` (from `static attributes`), delegated events
  (from `static events`) and live rendering (subscribe to `store:change` -> `render`).

## 4. Render loop

```
click / input
  → store.state.x = value        (Proxy set trap)
  → #emitChange → CustomEvent("store:change")
  → every element re-runs view(store.snapshot())
  → render() commits only the changed DOM parts
```

## 5. No imperative DOM

Components never touch `innerText`, `value` or `innerHTML`. The only writes to the DOM
go through the template engine parts (`model`, `<for>`, `<if>`, `{{ }}`, `${}`).

## 5b. `<for>` blocks

Every list uses `<for each="x in items">...{{ }}...</for>`. The engine renders the inner
markup as a template instance bound to the item context, so each block is incremental: the
DOM is updated in place and focus, caret and form state survive the store-driven re-render.
It is the only `<for>` form the engine exposes.

## 6. Remaining work

- Modals (TodoModal, CategoryModal) and QuickAdd (not in the active reference shell).
- Add QR codes / links to the talk deck.
- a11y checks.

## 7. Layout parity

The shell is verified against `reactive-apps-without-frameworks-demo` with Playwright
(`scripts/compare-with-reference.mjs`): header, app-shell, controls, debug sidebar, stats,
todo list and filters report identical boxes.
