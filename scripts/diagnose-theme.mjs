/**
 * Playwright diagnostic for theme, color-scheme, radius and responsive layout.
 *
 * Usage: node scripts/diagnose-theme.mjs
 * Requires the dev server on http://localhost:6002.
 */
import { chromium } from "playwright";

const URL = process.env.DEMO_URL ?? "http://localhost:6002";

/**
 * Read the theme-relevant computed state of the page.
 * @param {import("playwright").Page} page
 * @returns {Promise<object>}
 */
async function readState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const app = document.querySelector("ceb-app");
    const button = document.querySelector("button");
    const card = document.querySelector('[data-surface="card"]');
    const field = document.querySelector("[data-field] select");
    const marker = document.querySelector("[data-panel] h2") ?? document.querySelector('[data-component="todo-list"] h2');

    return {
      dataset: { ...root.dataset },
      appRoot: app?.dataset.appRoot ?? null,
      appDisplay: app ? getComputedStyle(app).display : null,
      appColumns: app ? getComputedStyle(app).gridTemplateColumns : null,
      appGap: app ? getComputedStyle(app).gap : null,
      bodyPadding: getComputedStyle(document.body).padding,
      radiusControl: rootStyle.getPropertyValue("--radius-control").trim(),
      radiusCard: rootStyle.getPropertyValue("--radius-card").trim(),
      radiusCheckbox: rootStyle.getPropertyValue("--radius-checkbox").trim(),
      colorCanvas: rootStyle.getPropertyValue("--color-canvas").trim(),
      buttonRadius: button ? getComputedStyle(button).borderRadius : null,
      cardRadius: card ? getComputedStyle(card).borderRadius : null,
      fieldRadius: field ? getComputedStyle(field).borderRadius : null,
      markerRadius: marker ? getComputedStyle(marker, "::before").borderRadius : null,
    };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("ceb-app");

const s0 = await readState(page);
console.log(
  "== initial ==",
  JSON.stringify({
    dataset: s0.dataset,
    appRoot: s0.appRoot,
    appDisplay: s0.appDisplay,
    appColumns: s0.appColumns,
    appGap: s0.appGap,
    radiusControl: s0.radiusControl,
    radiusCard: s0.radiusCard,
    radiusCheckbox: s0.radiusCheckbox,
  })
);

const selects = page.locator("ceb-header select");

console.log("\n== theme radius across themes ==");
for (const theme of ["studio", "atelier", "cabinet", "grove", "signal", "nocturne"]) {
  await selects.nth(1).selectOption(theme);
  await page.waitForTimeout(120);
  const s = await readState(page);
  console.log(
    theme.padEnd(9),
    "control=" + s.radiusControl.padEnd(7),
    "card=" + s.radiusCard.padEnd(7),
    "checkbox=" + s.radiusCheckbox.padEnd(7),
    "button=" + s.buttonRadius.padEnd(8),
    "cardbox=" + s.cardRadius.padEnd(8),
    "marker=" + s.markerRadius
  );
}

console.log("\n== color scheme ==");
for (const scheme of ["light", "dark", "system"]) {
  await selects.nth(0).selectOption(scheme);
  await page.waitForTimeout(120);
  const s = await readState(page);
  console.log(scheme.padEnd(7), "canvas=" + s.colorCanvas, "dataset.colorScheme=" + s.dataset.colorScheme);
}

console.log("\n== responsive ==");
await selects.nth(1).selectOption("studio");
for (const width of [1440, 1100, 800, 600]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.waitForTimeout(150);
  const s = await readState(page);
  console.log(String(width).padEnd(5), "display=" + s.appDisplay.padEnd(6), "columns=" + s.appColumns, "| gap=" + s.appGap, "| bodyPadding=" + s.bodyPadding);
}

await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: "/tmp/ceb-demo-1440.png", fullPage: true });
await page.setViewportSize({ width: 600, height: 1000 });
await page.screenshot({ path: "/tmp/ceb-demo-600.png", fullPage: true });

await browser.close();
