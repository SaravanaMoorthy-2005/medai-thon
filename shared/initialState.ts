import { defaultSteps, type Snapshot } from "./types";

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
