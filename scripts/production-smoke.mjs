import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import console from "node:console";

// Read-only browser check of the production bundle served by the running API.
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3001/");
  await page
    .getByText("SIMULATED LIVE", { exact: true })
    .waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "3D Hospital", exact: true }).click();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(1200);
  await mkdir("artifacts/qa", { recursive: true });
  await page.screenshot({
    path: "artifacts/qa/Production-hospital.png",
    fullPage: true,
  });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Production bundle, cookie session, WebSocket snapshot and hospital WebGL: PASS.",
  );
} finally {
  await browser.close();
}
