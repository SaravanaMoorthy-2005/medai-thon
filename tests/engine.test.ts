import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Engine } from "../server/engine";
import { Store } from "../server/store";
import { deviceFor, type InputEvent } from "../shared/types";
import { scenarios } from "../shared/scenarios";
import { kitParts, partPosition } from "../shared/hardware";
const engines: Engine[] = [];
const fresh = () => {
  const e = new Engine(new Store(":memory:"));
  engines.push(e);
  return e;
};
function emit(
  e: Engine,
  type: InputEvent["type"],
  bedId = "GW-B01",
  staffId = "D01",
  extra: Partial<InputEvent> = {},
) {
  return e.ingest({
    id: randomUUID(),
    deviceId: deviceFor(type, bedId),
    bedId,
    staffId,
    type,
    deviceTime: new Date().toISOString(),
    source: "SIMULATED",
    credential: `${type === "BLE_OBSERVATION" ? "BLE" : "RFID"}-${staffId}`,
    rssi: -52,
    ...extra,
  });
}
afterEach(() => {
  engines.splice(0).forEach((e) => e.store.close());
});
describe("Authoritative ward rule safety", () => {
  it("seeds exactly four General beds, three ICU zones and eight protocol slots", () => {
    const e = fresh();
    expect(e.state.beds.filter((b) => b.ward === "GENERAL")).toHaveLength(4);
    expect(e.state.beds.filter((b) => b.ward === "ICU")).toHaveLength(3);
    expect(e.state.policy.steps).toHaveLength(8);
  });
  it("same-staff next-bed check preserves prior evidence and opens the next visit", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "RFID_SCAN", "GW-B02");
    expect(e.state.opportunities[0].status).toBe("EVENT_NOT_DETECTED");
    expect(e.state.opportunities[1].status).toBe("HYGIENE_PENDING");
    expect(e.state.visits[1].endAt).toBeNull();
    expect(e.state.audit.some((a) => a.type === "REMINDER")).toBe(true);
  });
  it("another staff scan cannot evaluate the preceding staff visit", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "RFID_SCAN", "GW-B02", "N01");
    expect(e.state.alerts).toHaveLength(0);
    expect(e.state.visits.every((v) => v.endAt === null)).toBe(true);
  });
  it("uniquely associates a dispenser observation without fabricating clinical compliance", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "DISPENSER_ACTIVATE");
    emit(e, "RFID_SCAN", "GW-B02");
    expect(e.state.opportunities[0].status).toBe("EVENT_ASSOCIATED");
    expect(e.state.activations[0].opportunityId).toBe(
      e.state.opportunities[0].id,
    );
    expect(e.state.alerts).toHaveLength(0);
  });
  it("multiple plausible staff leave one activation unassigned", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "RFID_SCAN", "GW-B01", "N01");
    emit(e, "DISPENSER_ACTIVATE");
    expect(e.state.activations[0].opportunityId).toBeNull();
    expect(
      e.state.opportunities.every((o) => o.status === "NEEDS_REVIEW"),
    ).toBe(true);
  });
  it("rejects unknown and revoked identities and never infers unscanned presence", () => {
    const e = fresh();
    emit(e, "RFID_SCAN", "GW-B01", "D01", { credential: "UNKNOWN" });
    e.state.credentials[0].revoked = true;
    emit(e, "RFID_SCAN");
    emit(e, "MOVE_ACTOR");
    expect(e.state.visits).toHaveLength(0);
    expect(e.state.events[0].classification).toBe("IDENTITY_UNVERIFIED");
  });
  it("one BLE observation is incidental and packet loss creates no immediate exit", () => {
    const e = fresh();
    emit(e, "BLE_OBSERVATION", "ICU-B01");
    expect(e.state.visits).toHaveLength(0);
    emit(e, "BLE_OBSERVATION", "ICU-B01");
    emit(e, "BLE_OBSERVATION", "ICU-B01");
    expect(e.state.visits).toHaveLength(1);
    expect(e.state.opportunities[0].opportunityConfidence).toBe(0);
    emit(e, "HEARTBEAT", "ICU-B01");
    expect(e.state.alerts).toHaveLength(0);
    expect(e.state.visits[0].endAt).toBeNull();
  });
  it("a supported ICU care checkpoint can create an advisory missing-event alert", () => {
    const e = fresh();
    for (let i = 0; i < 3; i++) emit(e, "BLE_OBSERVATION", "ICU-B01");
    emit(e, "START_CARE", "ICU-B01");
    expect(e.state.opportunities[0].status).toBe("EVENT_NOT_DETECTED");
    expect(e.state.alerts).toHaveLength(1);
  });
  it("adjacent equal BLE signals preserve uncertainty at checkpoint", () => {
    const e = fresh();
    for (let i = 0; i < 3; i++) emit(e, "BLE_OBSERVATION", "ICU-B01");
    emit(e, "BLE_OBSERVATION", "ICU-B02", "D01", { rssi: -53 });
    emit(e, "START_CARE", "ICU-B01");
    expect(e.state.opportunities[0].status).toBe("NEEDS_REVIEW");
    expect(e.state.alerts).toHaveLength(0);
  });
  it("sensor fault then recovery cannot erase a visit data gap", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "DEVICE_FAULT");
    emit(e, "DEVICE_RECOVER");
    emit(e, "RFID_SCAN", "GW-B02");
    expect(e.state.opportunities[0].status).toBe("DATA_GAP");
    expect(e.state.alerts).toHaveLength(0);
  });
  it("buffers software observations durably and reconciles exactly once", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "NETWORK_DOWN");
    const input = {
      id: "queued-1",
      type: "DISPENSER_ACTIVATE" as const,
      deviceId: "GW-B01-DISP",
      bedId: "GW-B01",
      source: "SIMULATED" as const,
      deviceTime: new Date().toISOString(),
    };
    e.ingest(input);
    e.ingest(input);
    expect(e.state.queuedEvents).toHaveLength(1);
    expect(e.state.events.some((x) => x.id === input.id)).toBe(false);
    emit(e, "NETWORK_UP");
    expect(e.state.queuedEvents).toHaveLength(0);
    expect(e.state.events.filter((x) => x.id === input.id)).toHaveLength(1);
    e.ingest(input);
    expect(e.state.activations).toHaveLength(1);
    expect(e.state.opportunities[0].status).toBe("DATA_GAP");
  });
  it("duplicate raw observation has no new visit or audit side effects", () => {
    const e = fresh();
    const event = emit(e, "RFID_SCAN");
    const count = e.state.audit.length;
    e.ingest(event);
    expect(e.state.visits).toHaveLength(1);
    expect(e.state.audit.length).toBe(count);
  });
  it("unknown device and wrong device mapping are rejected atomically", () => {
    const e = fresh();
    expect(() =>
      emit(e, "RFID_SCAN", "GW-B01", "D01", { deviceId: "UNKNOWN" }),
    ).toThrow("Unknown device");
    expect(() =>
      emit(e, "RFID_SCAN", "GW-B01", "D01", { deviceId: "GW-B02-RFID" }),
    ).toThrow("does not match");
    expect(e.state.events).toHaveLength(0);
  });
  it("acknowledgment does not imply association or hygiene completion", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "RFID_SCAN", "GW-B02");
    e.alertAction(
      e.state.alerts[0].id,
      "acknowledge",
      "Review received",
      "SUPERVISOR",
    );
    expect(e.state.alerts[0].state).toBe("ACKNOWLEDGED");
    expect(e.state.opportunities[0].status).toBe("EVENT_NOT_DETECTED");
  });
  it("override requires reviewer role and reason and preserves the original alert evidence", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    emit(e, "RFID_SCAN", "GW-B02");
    const id = e.state.alerts[0].id;
    expect(() =>
      e.alertAction(id, "override", "Emergency intervention", "CLINICIAN"),
    ).toThrow();
    expect(() => e.alertAction(id, "override", "", "SUPERVISOR")).toThrow();
    e.alertAction(
      id,
      "override",
      "Emergency intervention documented",
      "SUPERVISOR",
    );
    expect(e.state.opportunities[0].status).toBe("OVERRIDE_RECORDED");
    expect(e.state.audit.some((a) => a.newState === "EVENT_NOT_DETECTED")).toBe(
      true,
    );
    expect(
      e.state.audit.some(
        (a) => a.type === "OVERRIDE_RECORDED" && a.actor === "demo-SUPERVISOR",
      ),
    ).toBe(true);
  });
  it("station activation cannot clear bedside opportunity", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    e.ingest({
      id: randomUUID(),
      type: "DISPENSER_ACTIVATE",
      deviceId: "STATION-DISP",
      bedId: "STATION",
      source: "SIMULATED",
      deviceTime: new Date().toISOString(),
    });
    expect(e.state.opportunities[0].status).toBe("HYGIENE_PENDING");
    expect(e.state.activations[0].status).toBe("UNMATCHED");
  });
  it("raw observations and audit are immutable at the SQL layer", () => {
    const e = fresh();
    emit(e, "RFID_SCAN");
    expect(() => e.store.db.exec("DELETE FROM DeviceEvent")).toThrow(
      "immutable",
    );
    expect(() => e.store.db.exec('UPDATE AuditLog SET time="x"')).toThrow();
  });
  it("device and server receipt clocks are stored separately with linked audit", () => {
    const e = fresh();
    const time = "2026-01-01T00:00:00.000Z";
    const event = emit(e, "RFID_SCAN", "GW-B01", "D01", { deviceTime: time });
    expect(event.deviceTime).toBe(time);
    expect(event.receivedTime).not.toBe(time);
    expect(
      e.state.audit.some(
        (a) => a.eventId === event.id && a.policyVersion === "research-1",
      ),
    ).toBe(true);
  });
  it("SQLite survives process-equivalent close and reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "hygiene-test-"));
    const path = join(dir, "evidence.sqlite");
    const e = new Engine(new Store(path));
    emit(e, "RFID_SCAN");
    const id = e.state.events[0].id;
    e.store.close();
    const restored = new Engine(new Store(path));
    expect(restored.state.events[0].id).toBe(id);
    expect(restored.state.visits).toHaveLength(1);
    restored.store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
describe("Deterministic scenario catalog", () => {
  for (const s of scenarios)
    it(`${s.id}: ${s.expected}`, () => {
      const e = fresh();
      const run = e.startRun(s.id);
      while (run.status !== "COMPLETED") e.runAction(run.id, "step");
      expect(e.prediction(run.id)).toBe(s.expected);
      const replay = e.startRun(s.id);
      while (replay.status !== "COMPLETED") e.runAction(replay.id, "step");
      expect(replay.id).not.toBe(run.id);
      expect(e.prediction(replay.id)).toBe(s.expected);
    });
});
describe("Hardware transforms and interface integrity", () => {
  for (const kit of ["GENERAL", "ICU"] as const)
    it(`${kit} reassembles exactly and keeps accessories separate`, () => {
      const parts = kitParts(kit);
      for (const p of parts) {
        expect(partPosition(p, 0)).toEqual(p.position);
        expect(partPosition(p, 1)).toEqual(
          p.position.map((v, i) => v + p.offset[i]),
        );
      }
      if (kit === "GENERAL")
        expect(parts.find((p) => p.id === "reader")?.connection).toContain(
          "SPI",
        );
      else {
        expect(parts.some((p) => p.id === "reader")).toBe(false);
        expect(parts.find((p) => p.id === "tag")?.connection).toContain(
          "BLE radio",
        );
      }
    });
});
