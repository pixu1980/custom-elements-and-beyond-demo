/**
 * Playwright check for the bulk actions and the store change log panels.
 *
 * Usage: node scripts/check-panels.mjs
 */
import { chromium } from "playwright";

const URL = process.env.DEMO_URL ?? "http://localhost:6002";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("ceb-app");
await page.waitForTimeout(400);

const bulkButtons = await page.$$eval("ceb-bulk-actions button", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
const hasDebug = (await page.$("ceb-debug-panel")) !== null;
const logBefore = await page.$$eval("ceb-debug-log-entry", (els) => els.length);
console.log("bulk buttons (" + bulkButtons.length + "):", JSON.stringify(bulkButtons));
console.log("debug panel present:", hasDebug, "| log entries before:", logBefore);

const statsBefore = await page.$$eval('[data-component="stat-card"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
console.log("stats before:", JSON.stringify(statsBefore));

await page.getByRole("button", { name: /select visible/i }).click();
await page.waitForTimeout(300);

const statsAfter = await page.$$eval('[data-component="stat-card"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
const logAfter = await page.$$eval("ceb-debug-log-entry", (els) => els.length);
const firstLog = await page.$eval("ceb-debug-log-entry strong", (el) => el.textContent.trim()).catch(() => null);
console.log("stats after select-visible:", JSON.stringify(statsAfter));
console.log("log entries after:", logAfter, "| newest path:", firstLog);

await page.getByRole("button", { name: /clear selection/i }).click();
await page.waitForTimeout(300);
const statsCleared = await page.$$eval('[data-component="stat-card"]', (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
console.log("stats after clear-selection:", JSON.stringify(statsCleared));

await page.screenshot({ path: "/tmp/ceb-panels.png", fullPage: true });
await browser.close();
