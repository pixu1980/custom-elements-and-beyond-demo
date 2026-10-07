/**
 * Playwright check: editing an input must keep focus and caret across the
 * store-driven re-render.
 *
 * Usage: node scripts/check-focus.mjs
 */
import { chromium } from "playwright";

const URL = process.env.DEMO_URL ?? "http://localhost:6002";

const browser = await chromium.launch();

/**
 * @param {string} label
 * @param {(page: import("playwright").Page) => Promise<void>} run
 */
async function scenario(label, run) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("ceb-app");
  await page.waitForTimeout(400);
  await run(page);
  await page.close();
  console.log(label);
}

const activeSlot = () => document.activeElement?.getAttribute("data-slot") ?? document.activeElement?.tagName;

await scenario("1. todo title (append)", async (page) => {
  const title = page.locator('ceb-todo-item input[data-slot="title"]:not([readonly])').first();
  await title.click();
  await title.press("End");
  await title.type("XYZ", { delay: 60 });
  await page.waitForTimeout(200);
  console.log("   active:", JSON.stringify(await page.evaluate(activeSlot)), "| value:", JSON.stringify(await title.inputValue()));
});

await scenario("2. todo title (caret in the middle)", async (page) => {
  const title = page.locator('ceb-todo-item input[data-slot="title"]:not([readonly])').first();
  await title.evaluate((el) => {
    el.focus();
    el.setSelectionRange(0, 0);
  });
  await page.keyboard.type(">>", { delay: 80 });
  await page.waitForTimeout(200);
  console.log("   active:", JSON.stringify(await page.evaluate(activeSlot)), "| caret:", await title.evaluate((el) => el.selectionStart), "| value:", JSON.stringify(await title.inputValue()));
});

await scenario("3. filter search", async (page) => {
  const search = page.locator("ceb-filters input").first();
  await search.click();
  await search.type("abc", { delay: 60 });
  await page.waitForTimeout(200);
  console.log("   active:", JSON.stringify(await page.evaluate(activeSlot)), "| value:", JSON.stringify(await search.inputValue()));
});

await scenario("4. header theme select", async (page) => {
  const theme = page.locator("ceb-header select").nth(1);
  await theme.focus();
  await theme.selectOption("cabinet");
  await page.waitForTimeout(200);
  console.log("   active:", JSON.stringify(await page.evaluate(activeSlot)), "| value:", JSON.stringify(await theme.inputValue()));
});

await browser.close();
