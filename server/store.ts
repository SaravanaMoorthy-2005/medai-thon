import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defaultSteps, type Snapshot } from "../shared/types";

const entities = {
  beds: "Bed",
  staff: "Staff",
  credentials: "StaffCredential",
  devices: "Device",
  visits: "Visit",
  opportunities: "HygieneOpportunity",
  activations: "DispenserEvent",
  alerts: "Alert",
  runs: "ScenarioRun",
  actors: "ActorState",
  techniques: "TechniqueSession",
  validations: "ValidationRun",
} as const;
export function initialState(): Snapshot {
  const beds: Snapshot["beds"] = Array.from({ length: 7 }, (_, i) => ({
    id: i < 4 ? `GW-B0${i + 1}` : `ICU-B0${i - 3}`,
    ward: i < 4 ? "GENERAL" : "ICU",
    name:
      i < 4
        ? `Bed ${String(i + 1).padStart(2, "0")}`
        : `Zone ${String(i - 3).padStart(2, "0")}`,
    active: true,
    position:
      i < 4
        ? [-7.5 + (i % 2) * 4, 0, -4 + Math.floor(i / 2) * 5]
        : [4.1 + (i - 4) * 3.8, 0, -2.8],
  }));
  return {
    sequence: 0,
    beds,
    staff: [
      { id: "D01", name: "Doctor 01", role: "Doctor", color: "#f4f5f1" },
      { id: "D02", name: "Doctor 02", role: "Doctor", color: "#e9eef0" },
      { id: "N01", name: "Nurse 01", role: "Nurse", color: "#448da8" },
      { id: "N02", name: "Nurse 02", role: "Nurse", color: "#268e86" },
      { id: "V01", name: "Visitor 01", role: "Visitor", color: "#c68d68" },
      { id: "V02", name: "Visitor 02", role: "Visitor", color: "#a5a182" },
    ],
    credentials: ["D01", "D02", "N01", "N02"].flatMap((staffId) =>
      (["RFID", "BLE"] as const).map((kind) => ({
        id: `${kind}-${staffId}`,
        staffId,
        kind,
        revoked: false,
      })),
    ),
    devices: [
      ...beds.flatMap((b) =>
        ([b.ward === "GENERAL" ? "RFID" : "BLE", "DISP", "FLOW"] as const).map(
          (k) => ({
            id: `${b.id}-${k}`,
            kind:
              k === "DISP"
                ? ("DISPENSER" as const)
                : k === "FLOW"
                  ? ("WORKFLOW" as const)
                  : k,
            bedId: b.id,
            status: "ONLINE" as const,
            lastSeen: null,
            firmware: "sim-2.0",
            source: "SIMULATED" as const,
          }),
        ),
      ),
      {
        id: "STATION-DISP",
        kind: "STATION",
        bedId: "STATION",
        status: "ONLINE",
        lastSeen: null,
        firmware: "sim-2.0",
        source: "SIMULATED",
      },
      {
        id: "STATION-FLOW",
        kind: "WORKFLOW",
        bedId: "STATION",
        status: "ONLINE",
        lastSeen: null,
        firmware: "sim-2.0",
        source: "SIMULATED",
      },
    ],
    visits: [],
    opportunities: [],
    events: [],
    activations: [],
    alerts: [],
    audit: [],
    runs: [],
    actors: [],
    techniques: [],
    validations: [],
    networkOnline: true,
    queuedEvents: [],
    policy: {
      version: "research-1",
      matchingWindowMs: 120000,
      bleWindowMs: 8000,
      bleMinSamples: 3,
      bleMargin: 7,
      alertCooldownMs: 30000,
      retentionDays: 30,
      steps: defaultSteps,
      protocolVersion: "demo-1",
      approved: false,
    },
  };
}
export class Store {
  db: DatabaseSync;
  constructor(path = process.env.HYGIENE_DB || "data/hygiene.sqlite") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS SchemaMigration(version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL);
      INSERT OR IGNORE INTO SchemaMigration VALUES(1,datetime('now'));
      CREATE TABLE IF NOT EXISTS Hospital(id TEXT PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL);
      INSERT OR IGNORE INTO Hospital VALUES('H01','Research Hospital','Asia/Calcutta');
      CREATE TABLE IF NOT EXISTS Ward(id TEXT PRIMARY KEY, hospitalId TEXT REFERENCES Hospital(id), type TEXT NOT NULL);
      INSERT OR IGNORE INTO Ward VALUES('GENERAL','H01','GENERAL'),('ICU','H01','ICU');
      CREATE TABLE IF NOT EXISTS DeviceEvent(id TEXT PRIMARY KEY, sequence INTEGER UNIQUE NOT NULL, deviceId TEXT NOT NULL, deviceTime TEXT NOT NULL, receivedTime TEXT NOT NULL, source TEXT NOT NULL, type TEXT NOT NULL, dedupeKey TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(deviceId,dedupeKey));
      CREATE TABLE IF NOT EXISTS Interpretation(eventId TEXT PRIMARY KEY REFERENCES DeviceEvent(id), classification TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS AuditLog(id TEXT PRIMARY KEY, sequence INTEGER UNIQUE NOT NULL, eventId TEXT, time TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS PolicyConfig(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS RuntimeState(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS Reminder(id TEXT PRIMARY KEY, alertId TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS Override(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS DeviceLocation(id TEXT PRIMARY KEY, deviceId TEXT NOT NULL, bedId TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS TechniqueStepResult(id TEXT PRIMARY KEY, sessionId TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS GroundTruthLabel(id TEXT PRIMARY KEY, runId TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ValidationCase(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS UserAccount(id TEXT PRIMARY KEY, role TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS event_time ON DeviceEvent(deviceTime,type);
      CREATE INDEX IF NOT EXISTS audit_event ON AuditLog(eventId);
      CREATE TRIGGER IF NOT EXISTS immutable_events_update BEFORE UPDATE ON DeviceEvent BEGIN SELECT RAISE(ABORT,'Source observations are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_events_delete BEFORE DELETE ON DeviceEvent BEGIN SELECT RAISE(ABORT,'Source observations are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_audit_update BEFORE UPDATE ON AuditLog BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_audit_delete BEFORE DELETE ON AuditLog BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;`);
    for (const table of Object.values(entities))
      this.db.exec(
        `CREATE TABLE IF NOT EXISTS ${table}(id TEXT PRIMARY KEY,payload TEXT NOT NULL)`,
      );
    for (const role of [
      "CLINICIAN",
      "SUPERVISOR",
      "INFECTION_PREVENTION",
      "BIOMEDICAL",
      "ADMIN",
      "AUDITOR",
    ])
      this.db
        .prepare("INSERT OR IGNORE INTO UserAccount VALUES(?,?)")
        .run(`demo-${role}`, role);
  }
  load(): Snapshot {
    const runtime = this.db
      .prepare("SELECT payload FROM RuntimeState WHERE id=?")
      .get("state") as { payload: string } | undefined;
    if (!runtime) {
      const s = initialState();
      this.save(s);
      return s;
    }
    const s = { ...initialState(), ...JSON.parse(runtime.payload) } as Snapshot;
    for (const [key, table] of Object.entries(entities))
      Object.assign(s, {
        [key]: (
          this.db.prepare(`SELECT payload FROM ${table}`).all() as {
            payload: string;
          }[]
        ).map((x) => JSON.parse(x.payload)),
      });
    s.policy = JSON.parse(
      (
        this.db
          .prepare("SELECT payload FROM PolicyConfig WHERE id=?")
          .get("active") as { payload: string }
      ).payload,
    );
    s.events = (
      this.db
        .prepare(
          "SELECT d.payload,d.receivedTime,d.sequence,i.classification FROM DeviceEvent d JOIN Interpretation i ON i.eventId=d.id ORDER BY d.sequence",
        )
        .all() as {
        payload: string;
        receivedTime: string;
        sequence: number;
        classification: string;
      }[]
    ).map((x) => ({
      ...JSON.parse(x.payload),
      receivedTime: x.receivedTime,
      sequence: x.sequence,
      classification: x.classification,
    }));
    s.audit = (
      this.db
        .prepare("SELECT payload FROM AuditLog ORDER BY sequence")
        .all() as { payload: string }[]
    ).map((x) => JSON.parse(x.payload));
    // Resume is explicit after process restart; elapsed scenario time never jumps forward.
    s.runs.forEach((r) => {
      if (r.status === "RUNNING") r.status = "PAUSED";
    });
    if (!s.devices.some((d) => d.id === "STATION-FLOW"))
      s.devices.push({
        id: "STATION-FLOW",
        kind: "WORKFLOW",
        bedId: "STATION",
        status: "ONLINE",
        lastSeen: null,
        firmware: "sim-2.0",
        source: "SIMULATED",
      });
    return s;
  }
  save(s: Snapshot) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const [key, table] of Object.entries(entities)) {
        const q = this.db.prepare(
          `INSERT INTO ${table}(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`,
        );
        for (const item of s[key as keyof typeof entities])
          q.run(item.id, JSON.stringify(item));
      }
      const event = this.db.prepare(
        "INSERT OR IGNORE INTO DeviceEvent VALUES(?,?,?,?,?,?,?,?,?)",
      );
      const interpretation = this.db.prepare(
        "INSERT OR IGNORE INTO Interpretation VALUES(?,?)",
      );
      for (const e of s.events) {
        const { receivedTime, sequence, classification, ...raw } = e;
        event.run(
          e.id,
          sequence,
          e.deviceId,
          e.deviceTime,
          receivedTime,
          e.source,
          e.type,
          e.dedupeKey || e.id,
          JSON.stringify(raw),
        );
        interpretation.run(e.id, classification);
      }
      const audit = this.db.prepare(
        "INSERT OR IGNORE INTO AuditLog VALUES(?,?,?,?,?)",
      );
      for (const a of s.audit)
        audit.run(a.id, a.sequence, a.eventId, a.time, JSON.stringify(a));
      this.db
        .prepare(
          "INSERT INTO RuntimeState VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
        )
        .run(
          "state",
          JSON.stringify({
            sequence: s.sequence,
            networkOnline: s.networkOnline,
            queuedEvents: s.queuedEvents,
          }),
        );
      this.db
        .prepare(
          "INSERT INTO PolicyConfig VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
        )
        .run("active", JSON.stringify(s.policy));
      for (const d of s.devices)
        this.db
          .prepare("INSERT OR IGNORE INTO DeviceLocation VALUES(?,?,?)")
          .run(d.id, d.id, d.bedId);
      for (const t of s.techniques)
        for (const step of t.steps)
          this.db
            .prepare("INSERT OR IGNORE INTO TechniqueStepResult VALUES(?,?,?)")
            .run(`${t.id}-${step.index}`, t.id, JSON.stringify(step));
      for (const v of s.validations)
        this.db
          .prepare("INSERT OR IGNORE INTO GroundTruthLabel VALUES(?,?,?)")
          .run(
            v.id,
            v.runId,
            JSON.stringify({
              expected: v.expected,
              observer: v.observer,
              method: v.method,
            }),
          );
      for (const a of s.audit) {
        if (a.type === "OVERRIDE_RECORDED")
          this.db
            .prepare("INSERT OR IGNORE INTO Override VALUES(?,?)")
            .run(a.id, JSON.stringify(a));
        if (a.type === "REMINDER")
          this.db
            .prepare("INSERT OR IGNORE INTO Reminder VALUES(?,?,?)")
            .run(a.id, a.entityId, JSON.stringify(a));
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
