/**
 * Playwright check: declarative bindings reflect and update the store.
 *
 * Usage: node scripts/check-bindings.mjs
 */
import { chromium } from "playwright";

const URL = process.env.DEMO_URL ?? "http://localhost:6002";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("ceb-app");
await page.waitForTimeout(400);

const item = page
  .locator("ceb-todo-item")
  .filter({ has: page.locator('input[data-slot="title"]:not([readonly])') })
  .first();

const titleValue = await item.locator('input[data-slot="title"]').inputValue();
const priority = await item.locator('select[data-value]:not([is="ceb-category-select"])').inputValue();
const category = await item.locator('select[is="ceb-category-select"]').inputValue();
const completed = await item.locator('input[type="checkbox"]').nth(1).isChecked();
console.log("initial -> title:", JSON.stringify(titleValue), "| priority:", priority, "| category:", category, "| completed:", completed);

// change the priority via the select
await item.locator('select[data-value]:not([is="ceb-category-select"])').selectOption("high");
await page.waitForTimeout(250);
const priorityAfter = await item.locator('select[data-value]:not([is="ceb-category-select"])').inputValue();
const priorityChip = await item.locator('[data-component="priority-chip"]').textContent();
console.log("after priority=high -> select:", priorityAfter, "| chip:", priorityChip.trim());

// change the category via the category select
await item.locator('select[is="ceb-category-select"]').selectOption("Engine");
await page.waitForTimeout(250);
const categoryAfter = await item.locator('select[is="ceb-category-select"]').inputValue();
console.log("after category=Engine -> select:", categoryAfter);

// toggle completion and read the "Done" stat card
const stats = async () => page.$$eval('[data-component="stat-card"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
console.log("stats before complete:", JSON.stringify(await stats()));
await item.locator('input[type="checkbox"]').nth(1).check();
await page.waitForTimeout(250);
console.log("stats after complete:", JSON.stringify(await stats()));

await browser.close();
