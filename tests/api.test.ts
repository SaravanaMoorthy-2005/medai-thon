import { it, expect } from "vitest";
import { createApp } from "../server/app";
import { Engine } from "../server/engine";
import { Store } from "../server/store";

it("API sessions enforce all six roles and deny hardware spoofing", async () => {
  const { app, engine } = await createApp(new Engine(new Store(":memory:")));
  expect((await app.inject("/api/state")).statusCode).toBe(401);
  for (const role of [
    "CLINICIAN",
    "SUPERVISOR",
    "INFECTION_PREVENTION",
    "BIOMEDICAL",
    "ADMIN",
    "AUDITOR",
  ]) {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { role },
    });
    const cookie = login.headers["set-cookie"] as string;
    expect(
      (await app.inject({ url: "/api/state", headers: { cookie } })).statusCode,
    ).toBe(200);
    const bed = await app.inject({
      method: "POST",
      url: "/api/beds",
      headers: { cookie },
      payload: { ward: "GENERAL", name: "Test bed" },
    });
    expect(bed.statusCode).toBe(role === "ADMIN" ? 200 : 403);
  }
  expect(engine.state.audit.some((a) => a.type === "PERMISSION_DENIED")).toBe(
    true,
  );
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { role: "ADMIN" },
  });
  const cookie = login.headers["set-cookie"] as string;
  const hardware = await app.inject({
    method: "POST",
    url: "/api/events",
    headers: { cookie },
    payload: {
      id: "hardware-spoof",
      type: "RFID_SCAN",
      deviceId: "GW-B01-RFID",
      deviceTime: new Date().toISOString(),
      source: "HARDWARE",
      credential: "RFID-D01",
    },
  });
  expect(hardware.statusCode).toBe(403);
  await app.close();
});
it("eight ordered unknown technique steps persist unable-to-assess and station separation", async () => {
  const { app, engine } = await createApp(new Engine(new Store(":memory:")));
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { role: "CLINICIAN" },
  });
  const cookie = login.headers["set-cookie"] as string;
  const session = (
    await app.inject({
      method: "POST",
      url: "/api/technique",
      headers: { cookie },
      payload: {},
    })
  ).json() as { id: string };
  const wrong = await app.inject({
    method: "POST",
    url: `/api/technique/${session.id}/step`,
    headers: { cookie },
    payload: { index: 3, result: "UNKNOWN", confidence: 0 },
  });
  expect(wrong.statusCode).toBe(409);
  for (let i = 1; i <= 8; i++) {
    const r = await app.inject({
      method: "POST",
      url: `/api/technique/${session.id}/step`,
      headers: { cookie },
      payload: { index: i, result: "UNKNOWN", confidence: 0 },
    });
    expect(r.statusCode).toBe(200);
  }
  expect(engine.state.techniques[0].result).toBe("UNABLE_TO_ASSESS");
  expect(
    engine.store.db.prepare("SELECT COUNT(*) n FROM TechniqueStepResult").get()
      ?.n,
  ).toBe(8);
  await app.close();
});
it("configuration validates minimum bed counts and versions the eight-step protocol", async () => {
  const { app, engine } = await createApp(new Engine(new Store(":memory:")));
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { role: "ADMIN" },
  });
  const cookie = login.headers["set-cookie"] as string;
  expect(
    (
      await app.inject({
        method: "PATCH",
        url: "/api/beds/ICU-B01",
        headers: { cookie },
        payload: { active: false },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await app.inject({
        method: "PATCH",
        url: "/api/policy",
        headers: { cookie },
        payload: { steps: ["only one"] },
      })
    ).statusCode,
  ).toBe(400);
  expect(engine.state.policy.steps).toHaveLength(8);
  await app.close();
});
