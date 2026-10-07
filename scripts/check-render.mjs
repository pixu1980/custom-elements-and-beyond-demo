/**
 * Playwright check for the `<for>` and `<if>` template blocks.
 *
 * Usage: node scripts/check-render.mjs
 * Requires the dev server on http://localhost:6002.
 */
import { chromium } from "playwright";

const URL = process.env.DEMO_URL ?? "http://localhost:6002";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("ceb-app");

const cards = await page.$$eval('[data-component="stat-card"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
console.log("<for> stat cards (" + cards.length + "):", JSON.stringify(cards));

const initialEmpty = await page.$$eval('[data-slot="empty"]', (els) => els.map((e) => e.textContent.trim()));
const initialRows = await page.$$eval("ceb-todo-item", (els) => els.length);
console.log("initial  -> empty blocks:", initialEmpty.length, "| todo items:", initialRows);

const search = page.locator("ceb-filters input").first();
await search.fill("zzzz-no-match");
await page.waitForTimeout(250);

const emptyAfter = await page.$$eval('[data-slot="empty"]', (els) => els.map((e) => e.textContent.trim()));
const rowsAfter = await page.$$eval("ceb-todo-item", (els) => els.length);
console.log("filtered -> empty blocks:", emptyAfter.length, JSON.stringify(emptyAfter), "| todo items:", rowsAfter);

await search.fill("");
await page.waitForTimeout(250);
const rowsReset = await page.$$eval("ceb-todo-item", (els) => els.length);
console.log("reset    -> todo items:", rowsReset);

await browser.close();
