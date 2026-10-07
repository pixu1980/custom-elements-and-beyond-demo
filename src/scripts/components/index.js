/**
 * Registers every custom element used by the demo.
 *
 * Each component self-registers through the metadata-driven decorator in its
 * `static {}` block:
 * - customized built-ins (controls): `ceb-button`.
 * - autonomous elements (containers): `ceb-app`, `ceb-header`, `ceb-stats-row`,
 *   `ceb-filters`, `ceb-bulk-actions`, `ceb-todo-list`, `ceb-todo-item`,
 *   `ceb-debug-panel`, `ceb-debug-log-entry`.
 */
import "@/components/Button/index.js";
import "@/components/App/index.js";
import "@/components/Header/index.js";
import "@/components/StatsRow/index.js";
import "@/components/Filters/index.js";
import "@/components/BulkActions/index.js";
import "@/components/TodoList/index.js";
import "@/components/CategorySelect/index.js";
import "@/components/TodoItem/index.js";
import "@/components/DebugPanel/index.js";
import "@/components/DebugLogEntry/index.js";
