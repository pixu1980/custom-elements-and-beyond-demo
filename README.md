# Custom Elements and Beyond Demo

Standalone Todo demo extracted from the **customElements & beyond** talk.

It replicates the `reactive-apps-without-frameworks-demo` app, but the view layer is rebuilt with **custom elements** and the **`html` template engine** instead of signals. See [CONTEXT.md](CONTEXT.md) for the architecture.

## Scripts

```bash
pnpm install
pnpm dev     # parcel dev server on http://localhost:6002
pnpm build   # production build into ./dist
pnpm lint    # prettier + biome
```

## Runtime in one line

```
store (Proxy) ──store:change──▶ connectStore(el, view) ──render(view(snapshot), el)──▶ DOM parts
```

## Custom elements

- **customized built-ins** (controls): `button is="ceb-button"`.
- **autonomous** (containers): `ceb-app`, `ceb-header`, `ceb-stats-row`, `ceb-filters`, `ceb-todo-list`, `ceb-todo-item`.

## Vendored engine

The store and the template engine are vendored from `@pix-galaxy/pix-vanilla-reactive` into `src/scripts/core/`.
Signals are kept only because the engine imports `isSignalLike` internally; the app never creates a signal.

## GitHub Pages

The workflow in [.github/workflows/static.yml](.github/workflows/static.yml) publishes `dist` on tags.

Expected production URL:

```text
https://pixu1980.github.io/custom-elements-and-beyond-demo/
```

## Status

Full shell parity: App, Header, StatsRow, Filters, BulkActions, TodoList, TodoItem, DebugPanel + DebugLogEntry, CebButton.
Layout verified against `reactive-apps-without-frameworks-demo` with Playwright (`scripts/compare-with-reference.mjs`).
Modals (TodoModal, CategoryModal) and QuickAdd are not part of the active reference shell.
