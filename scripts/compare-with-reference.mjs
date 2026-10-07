/**
 * Playwright comparison between the custom-elements demo (6002) and the
 * reference reactive demo (6003): layout boxes side by side.
 *
 * Usage: node scripts/compare-with-reference.mjs
 */
import { chromium } from "playwright";

const TARGET = "http://localhost:6002";
const REFERENCE = "http://localhost:6003";

/**
 * Snapshot the layout-relevant computed state of a page.
 * @param {import("playwright").Page} page
 * @returns {Promise<object>}
 */
async function snapshot(page) {
  return page.evaluate(() => {
    /**
     * @param {Element | null} el
     * @returns {object | null}
     */
    function box(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        gridColumn: cs.gridColumn,
      };
    }

    const root = document.querySelector("[data-app-root]");
    const selectors = {
      header: '[data-component="header"]',
      appShell: '[data-component="app-shell"]',
      controls: '[data-slot="controls"]',
      debug: '[data-slot="debug-sidebar"]',
      statsRow: '[data-component="stats-row"]',
      todoList: '[data-component="todo-list"]',
      filters: '[data-component="filters"]',
      firstButton: "button",
    };
    const parts = {};
    for (const [key, sel] of Object.entries(selectors)) parts[key] = box(document.querySelector(sel));

    return {
      root: root ? { tag: root.tagName.toLowerCase(), display: getComputedStyle(root).display, gridTemplateColumns: getComputedStyle(root).gridTemplateColumns } : null,
      parts,
      todoItems: document.querySelectorAll('[data-component="todo-item"]').length,
      statCards: document.querySelectorAll('[data-component="stat-card"]').length,
    };
  });
}

const browser = await chromium.launch();
const snaps = {};

for (const [label, url] of [
  ["reference", REFERENCE],
  ["target", TARGET],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  snaps[label] = await snapshot(page);
  await page.screenshot({ path: `/tmp/compare-${label}.png`, fullPage: true });
  await page.close();
}

await browser.close();

const fmt = (p) => (p ? `${p.x},${p.y},${p.w},${p.h}` : "null");

console.log("root grid: reference =", snaps.reference.root?.gridTemplateColumns, "| target =", snaps.target.root?.gridTemplateColumns);
console.log("\npart".padEnd(12) + "reference (x,y,w,h)".padEnd(24) + "target (x,y,w,h)".padEnd(24) + "match");
for (const key of ["header", "appShell", "controls", "debug", "statsRow", "todoList", "filters", "firstButton"]) {
  const r = snaps.reference.parts[key];
  const t = snaps.target.parts[key];
  const match = r && t && fmt(r) === fmt(t) ? "OK" : "DIFF";
  console.log(key.padEnd(12) + fmt(r).padEnd(24) + fmt(t).padEnd(24) + match);
}
console.log("\ntodoItems: reference =", snaps.reference.todoItems, "| target =", snaps.target.todoItems);
console.log("statCards: reference =", snaps.reference.statCards, "| target =", snaps.target.statCards);
