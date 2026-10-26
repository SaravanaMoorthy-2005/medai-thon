import { test, expect } from "@playwright/test";
import type { Snapshot } from "../../shared/types";
test("RFID evidence, ICU workflow, review and refresh are connected end to end", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Command Center", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "3D Hospital", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .locator(".bed-selector")
    .getByRole("button", { name: "GW-B01", exact: true })
    .click();
  await page.getByRole("button", { name: "Tap registered badge" }).click();
  await expect
    .poll(async () => {
      const s = await page.request.get("/api/state");
      return ((await s.json()) as Snapshot).visits.filter(
        (v) => !v.runId && v.bedId === "GW-B01",
      ).length;
    })
    .toBeGreaterThan(0);
  await page
    .locator(".bed-selector")
    .getByRole("button", { name: "GW-B02", exact: true })
    .click();
  await page.getByRole("button", { name: "Tap registered badge" }).click();
  await expect
    .poll(async () => {
      const s = await page.request.get("/api/state");
      return ((await s.json()) as Snapshot).alerts.length;
    })
    .toBeGreaterThan(0);
  const before = (await (
    await page.request.get("/api/state")
  ).json()) as Snapshot;
  await page.reload();
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  const after = (await (
    await page.request.get("/api/state")
  ).json()) as Snapshot;
  expect(after.events.length).toBe(before.events.length);
  await page
    .getByRole("button", { name: "ICU Monitoring", exact: true })
    .click();
  await page.getByRole("button", { name: "Observe tag · 3 samples" }).click();
  await page.getByRole("button", { name: "Explicit care checkpoint" }).click();
  await expect
    .poll(async () => {
      const s = await page.request.get("/api/state");
      return ((await s.json()) as Snapshot).opportunities.some(
        (o) => o.bedId === "ICU-B01" && o.checkpoint === "START_CARE",
      );
    })
    .toBe(true);
  await page
    .getByRole("button", { name: "Alerts & Review", exact: true })
    .click();
  await page
    .getByPlaceholder(
      "Document your review, evidence or authorized emergency exception…",
    )
    .fill("Acknowledged for evidence review");
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(
    page
      .locator(".two-column>.panel")
      .last()
      .getByText("Acknowledged", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("both hardware assemblies, all modules and guided-only station are usable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Hardware Explorer", exact: true })
    .click();
  await page.waitForTimeout(1000);
  await expect(
    page.locator(".part").filter({ hasText: "RC522 short-range reader" }),
  ).toBeVisible();
  const slider = page.getByRole("slider", { name: "Explosion progress" });
  await slider.fill("1");
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page
    .locator(".parts-list")
    .getByRole("button", { name: /RC522 short-range reader/ })
    .click();
  await expect(page.locator(".inspector h2")).toHaveText(
    "RC522 short-range reader",
  );
  await page.getByRole("button", { name: "ICU / BLE", exact: true }).click();
  await expect(
    page
      .locator(".parts-list")
      .getByRole("button", { name: /Independent BLE wearable/ }),
  ).toBeVisible();
  await expect(page.locator(".part").filter({ hasText: "RC522" })).toHaveCount(
    0,
  );
  for (const module of [
    "Opportunity Engine",
    "Scenario Lab",
    "Live Analytics",
    "Validation Lab",
    "Devices & Admin",
  ]) {
    await page.getByRole("button", { name: module, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: module, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Technique Station", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start guided session", exact: true })
    .click();
  for (let i = 1; i <= 8; i++) {
    await expect(
      page.getByRole("heading", { name: `Step ${i} of 8`, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Record step & continue →", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "UNABLE TO ASSESS", exact: true }),
  ).toBeVisible();
});
test("administrator configuration persists and auditor mutations are denied", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Demo role" }).selectOption("ADMIN");
  await page
    .getByRole("button", { name: "Devices & Admin", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Configuration", exact: true })
    .click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("QA extension bed");
  await page.getByRole("button", { name: "Create bed & devices" }).click();
  await expect(page.getByText("QA extension bed · Active")).toBeVisible();
  const configured = (await (
    await page.request.get("/api/state")
  ).json()) as Snapshot;
  const added = configured.beds.find((b) => b.name === "QA extension bed")!;
  await page.request.patch(`/api/beds/${added.id}`, {
    data: { active: false },
  });
  await page
    .getByRole("combobox", { name: "Demo role" })
    .selectOption("AUDITOR");
  await expect(page.getByRole("combobox", { name: "Demo role" })).toHaveValue(
    "AUDITOR",
  );
  const result = await page.request.post("/api/beds", {
    data: { ward: "GENERAL", name: "Unauthorized bed" },
  });
  expect(result.status()).toBe(403);
});
test("responsive viewport and docked inspector screenshot QA", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    for (const module of [
      "3D Hospital",
      "Hardware Explorer",
      "Live Analytics",
    ]) {
      await page.getByRole("button", { name: module, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: module, exact: true }),
      ).toBeVisible();
      if (module === "Hardware Explorer")
        await page
          .getByRole("slider", { name: "Explosion progress" })
          .fill("1");
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      if (module === "3D Hospital" && size.width > 1050) {
        const canvas = await page.locator(".hospital-canvas").boundingBox();
        const inspector = await page
          .locator(".twin-grid>.inspector")
          .boundingBox();
        expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(inspector!.x + 1);
      }
      await page.screenshot({
        path: `test-results/qa/${module.replaceAll(" ", "-")}-${size.width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.body.style.zoom = "1.25";
  });
  await page
    .getByRole("button", { name: "Hardware Explorer", exact: true })
    .click();
  await page.waitForTimeout(1200);
  const stageBefore = await page.locator(".canvas-wrap").boundingBox();
  await page.waitForTimeout(1500);
  const stageAfter = await page.locator(".canvas-wrap").boundingBox();
  expect(stageAfter!.height).toBeLessThan(800);
  expect(Math.abs(stageAfter!.height - stageBefore!.height)).toBeLessThan(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThan(1800);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/qa/Hardware-125-percent.png",
    fullPage: true,
  });
});

test("local camera model processes synthetic video and denied permission falls back safely", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Technique Station", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop camera", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("0 hands observed")).toBeVisible();
  await page.screenshot({
    path: "test-results/qa/Technique-local-model.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Stop camera", exact: true }).click();
  await expect(page.getByText("CAMERA OFF", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Test denied", "NotAllowedError");
    };
  });
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(page.getByText("CAMERA DENIED", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/qa/Technique-camera-denied.png",
    fullPage: true,
  });
});

test("assembly stages, focused wards, command center and validation visual evidence", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/qa/Command-Center.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "3D Hospital", exact: true }).click();
  await page
    .locator(".bed-selector")
    .getByRole("button", { name: "GW-B02", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "test-results/qa/General-bed-focus.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ICU Monitoring", exact: true })
    .click();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "test-results/qa/ICU-ward-focus.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Hardware Explorer", exact: true })
    .click();
  for (const kit of ["General Ward / RFID", "ICU / BLE"]) {
    await page.getByRole("button", { name: kit, exact: true }).click();
    for (const progress of ["0", "0.5", "1"]) {
      await page
        .getByRole("slider", { name: "Explosion progress" })
        .fill(progress);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `test-results/qa/${kit.startsWith("ICU") ? "ICU" : "RFID"}-assembly-${progress}.png`,
        fullPage: true,
      });
    }
  }
  await page
    .getByRole("button", { name: "Show three-zone deployment" })
    .click();
  await page.screenshot({
    path: "test-results/qa/ICU-three-nodes.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Validation Lab", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/qa/Validation-Lab.png",
    fullPage: true,
  });
});

test("analytics filters use the same persisted evidence as the table and chart", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("SIMULATED LIVE", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Live Analytics", exact: true })
    .click();
  await page.getByLabel("Bed", { exact: true }).selectOption("GW-B01");
  const state = (await (
    await page.request.get("/api/state")
  ).json()) as Snapshot;
  const expected = state.events.filter((e) => e.bedId === "GW-B01").length;
  await expect(
    page.locator(".metrics>div").first().locator("strong"),
  ).toHaveText(String(expected));
  for (const cell of await page
    .locator("tbody tr td:nth-child(3)")
    .allTextContents())
    expect(cell).toContain("GW-B01");
  await page
    .getByLabel("Classification", { exact: true })
    .selectOption("HYGIENE_PENDING");
  const filtered = state.events.filter(
    (e) => e.bedId === "GW-B01" && e.classification === "HYGIENE_PENDING",
  ).length;
  await expect(
    page.locator(".metrics>div").first().locator("strong"),
  ).toHaveText(String(filtered));
  await page.getByRole("button", { name: "Export ward evidence" }).click();
  await expect(page.getByRole("alert")).toContainText("not authorized");
  await page.getByRole("combobox", { name: "Demo role" }).selectOption("ADMIN");
  const download = page.waitForEvent("download");
  await expect
    .poll(
      async () => (await (await page.request.get("/api/session")).json()).role,
    )
    .toBe("ADMIN");
  await page.getByRole("button", { name: "Export ward evidence" }).click();
  expect((await download).suggestedFilename()).toBe("hygiene-evidence.csv");
});
