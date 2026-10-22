import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3100";
const shots = process.env.SHOTS || "/tmp/sa-shots";
const log = (...a) => console.log("✔", ...a);
const fail = (m) => { console.error("✘", m); process.exitCode = 1; };
const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(BASE + "/");
await page.screenshot({ path: `${shots}/landing.png`, fullPage: true });
await page.getByRole("link", { name: /Add your first subscription/ }).click();
await page.getByRole("dialog").waitFor();
log("landing CTA opens add form");

async function addSub({ name, amount, cycle, date, cat }) {
  const d = page.getByRole("dialog");
  await d.getByPlaceholder("e.g. Netflix").fill(name);
  if (amount != null) await d.getByPlaceholder("Unknown").fill(String(amount));
  if (cycle) await d.locator("select").nth(1).selectOption(cycle);
  if (date) await d.locator('input[type="date"]').fill(date);
  if (cat) await d.locator("select").nth(2).selectOption(cat);
  await d.getByRole("button", { name: "Add subscription" }).click();
  await d.waitFor({ state: "hidden" });
}
await addSub({ name: "Netflix", amount: 15.49, date: iso(5) });
await page.getByRole("button", { name: /^Add$/ }).click();
await addSub({ name: "Dropbox", amount: 120, cycle: "annual", date: iso(20), cat: "Cloud" });
await page.getByRole("button", { name: /^Add$/ }).click();
await addSub({ name: "Gym", amount: null, date: iso(60), cat: "Fitness" });
const body = await page.textContent("body");
// monthly = 15.49 + 10 = 25.49 ; annual = 185.88 + 120 = 305.88 ; next30 = 135.49
for (const s of ["$25.49", "$305.88", "$135.49", "1 active subscription has no price"]) body.includes(s) ? log("totals show", s) : fail("missing " + s);
(await page.locator("text=Renewing in the next 30 days").count()) ? log("upcoming section") : fail("no upcoming");
const upcomingText = await page.locator("ul.divide-y").first().textContent();
upcomingText.includes("Netflix") && upcomingText.includes("Dropbox") && !upcomingText.includes("Gym") ? log("upcoming lists only <=30d") : fail("upcoming wrong: " + upcomingText);

// validation
await page.getByRole("button", { name: /^Add$/ }).click();
await page.getByRole("dialog").getByRole("button", { name: "Add subscription" }).click();
(await page.getByText("Name is required").count()) ? log("validation works") : fail("no validation");
await page.keyboard.press("Escape"); await page.waitForTimeout(300);

// edit
await page.getByRole("button", { name: "Netflix", exact: true }).click();
const d = page.getByRole("dialog");
await d.getByPlaceholder("Unknown").fill("17.99");
await d.getByRole("button", { name: "Save changes" }).click();
await d.waitFor({ state: "hidden" });
(await page.textContent("body")).includes("$27.99") ? log("edit updates totals") : fail("edit totals");

// search/filter
await page.getByPlaceholder("Search name, notes, category").fill("drop");
(await page.locator("tbody tr").count()) === 1 ? log("search filters") : fail("search");
await page.getByPlaceholder("Search name, notes, category").fill("");

// notifications bell (Netflix in 5 days)
await page.getByRole("button", { name: "Notifications" }).click();
await page.waitForTimeout(400); const menuTxt = await page.locator("[data-base-ui-portal]").last().textContent(); menuTxt.includes("Renewing within 7 days") && menuTxt.includes("Netflix") ? log("in-app notification") : fail("notification: " + menuTxt);
await page.keyboard.press("Escape"); await page.waitForTimeout(300);

// bulk paste
await page.getByRole("button", { name: /Paste statement/ }).click();
await page.getByRole("dialog").locator("textarea").fill("SPOTIFY USA 11.99 USD 11/02/2026\nWHOLE FOODS 54.20\nHULU 866 $9.99");
await page.getByRole("button", { name: "Find subscriptions" }).click();
const sugg = await page.getByRole("dialog").textContent();
sugg.includes("suggestion") ? log("paste shows suggestions for confirmation") : fail("no suggestions");
const n0 = await page.locator("tbody tr").count();
// untick everything except Spotify
const rows = page.getByRole("dialog").locator('[data-testid=suggestion]');
const count = await rows.count();
for (let i = 0; i < count; i++) {
  const v = await rows.nth(i).locator("input").nth(1).inputValue();
  if (v !== "Spotify") await rows.nth(i).locator('input[type="checkbox"]').uncheck();
}
await page.getByRole("button", { name: /Add 1 selected/ }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
(await page.locator("tbody tr").count()) === n0 + 1 ? log("confirmed suggestion added (only selected)") : fail("paste add count");

// cancel helper
await page.getByRole("button", { name: "Actions for Netflix" }).click();
await page.getByRole("menuitem", { name: "Cancel help" }).click();
const href = await page.getByRole("link", { name: /Open cancel page/ }).getAttribute("href");
href === "https://www.netflix.com/cancelplan" ? log("cancel link", href) : fail("cancel href " + href);
await page.getByRole("button", { name: /I canceled it/ }).click();
await page.waitForTimeout(300);
(await page.getByRole("button", { name: "Netflix", exact: true }).count()) === 0 ? log("canceled + archived") : fail("not archived");
(await page.textContent("body")).includes("$21.99") ? log("totals exclude canceled") : fail("canceled totals");

// snooze
const snoozeBtns = page.getByRole("button", { name: "Snooze" });
const before = await snoozeBtns.count();
await snoozeBtns.first().click();
await page.waitForTimeout(300);
(await snoozeBtns.count()) === before - 1 ? log("snooze hides upcoming item") : fail("snooze");
await page.screenshot({ path: `${shots}/dashboard.png`, fullPage: true });

// persistence
await page.reload();
await page.locator("tbody tr").first().waitFor();
(await page.locator("tbody tr").count()) >= 3 ? log("localStorage persists after reload") : fail("persist");

// report + share
await page.goto(BASE + "/report");
await page.getByRole("button", { name: /Create read-only link/ }).click();
const link = await page.locator("input[readonly]").inputValue();
link.includes("/r/local#") ? log("local share link created") : fail("share link " + link);
await page.screenshot({ path: `${shots}/report.png`, fullPage: true });
const p2 = await (await browser.newContext()).newPage();
await p2.goto(link);
await p2.getByText("read-only").waitFor();
const shared = await p2.textContent("body");
shared.includes("Dropbox") && shared.includes("Spotify") ? log("share link renders in a fresh browser") : fail("share render");

// demo
await page.goto(BASE + "/app?demo=1");
await page.getByText("Demo — sample data.").waitFor();
log("demo labeled as sample data");
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${shots}/demo-mobile.png`, fullPage: true });
// demo should not touch local data
await page.goto(BASE + "/app");
await page.locator("tbody tr").first().waitFor();
(await page.textContent("body")).includes("Adobe") ? fail("demo leaked into local") : log("demo did not write to local list");

errors.length ? fail("page errors: " + errors.join(" | ")) : log("no page errors");
await browser.close();
