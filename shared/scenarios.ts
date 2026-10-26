import type { Scenario, ScenarioAction } from "./types";
const a = (
  tMs: number,
  type: ScenarioAction["type"],
  bedId: string,
  staffId = "D01",
  extra: Partial<ScenarioAction> = {},
): ScenarioAction => ({ tMs, type, bedId, staffId, ...extra });
const tap = (t: number, bed: string, staff = "D01") =>
  a(t, "RFID_SCAN", bed, staff, { credential: `RFID-${staff}`, action: "tap" });
const ble = (bed: string, staff = "D01") =>
  [0, 1200, 2400].map((t) =>
    a(t, "BLE_OBSERVATION", bed, staff, {
      credential: `BLE-${staff}`,
      rssi: -52,
      action: "walk",
    }),
  );
export const scenarios: Scenario[] = [
  {
    id: "GW-01",
    title: "A complete bedside visit",
    ward: "GENERAL",
    description:
      "Badge tap, uniquely associated dispenser activation, then the same clinician’s next bed checkpoint.",
    actions: [
      tap(0, "GW-B01"),
      a(2500, "DISPENSER_ACTIVATE", "GW-B01", "D01", { action: "press" }),
      tap(5500, "GW-B02"),
    ],
    expected: "EVENT_ASSOCIATED",
  },
  {
    id: "GW-02",
    title: "The next-bed safety check",
    ward: "GENERAL",
    description:
      "Skip the first dispenser. The next tap evaluates the preceding visit and opens the new visit.",
    actions: [tap(0, "GW-B01"), tap(4500, "GW-B02")],
    expected: "EVENT_NOT_DETECTED",
  },
  {
    id: "GW-03",
    title: "Before care begins",
    ward: "GENERAL",
    description:
      "An explicit care-start checkpoint supports an earlier reminder.",
    actions: [tap(0, "GW-B01"), a(2500, "START_CARE", "GW-B01")],
    expected: "EVENT_NOT_DETECTED",
  },
  {
    id: "GW-04",
    title: "Two clinicians, one dispenser",
    ward: "GENERAL",
    description:
      "A shared activation stays ambiguous. No automatic assignment to either person.",
    actions: [
      tap(0, "GW-B03"),
      tap(1500, "GW-B03", "N01"),
      a(3500, "DISPENSER_ACTIVATE", "GW-B03"),
    ],
    expected: "NEEDS_REVIEW",
  },
  {
    id: "GW-05",
    title: "Visitors at the bedside",
    ward: "GENERAL",
    description:
      "Visitors remain separate from staff identity; movement is not an RFID observation.",
    actions: [
      a(0, "MOVE_ACTOR", "GW-B04", "V01"),
      a(1000, "MOVE_ACTOR", "GW-B04", "V02"),
      tap(2500, "GW-B04", "N01"),
    ],
    expected: "HYGIENE_PENDING",
  },
  {
    id: "GW-06",
    title: "An unregistered badge",
    ward: "GENERAL",
    description:
      "Record an unverified identity without inventing a staff visit.",
    actions: [a(0, "RFID_SCAN", "GW-B02", "D01", { credential: "UNKNOWN" })],
    expected: "IDENTITY_UNVERIFIED",
  },
  {
    id: "GW-07",
    title: "An unscanned entry",
    ward: "GENERAL",
    description:
      "Actor motion alone cannot establish RFID identity or contact.",
    actions: [a(0, "MOVE_ACTOR", "GW-B01", "V01")],
    expected: "MOVEMENT_ONLY",
  },
  {
    id: "ICU-01",
    title: "A supported ICU opportunity",
    ward: "ICU",
    description:
      "Stable BLE observations, a dispenser activation, then a configured care-start checkpoint.",
    actions: [
      ...ble("ICU-B01"),
      a(3500, "DISPENSER_ACTIVATE", "ICU-B01"),
      a(5000, "START_CARE", "ICU-B01"),
    ],
    expected: "EVENT_ASSOCIATED",
  },
  {
    id: "ICU-02",
    title: "A pre-contact reminder",
    ward: "ICU",
    description:
      "BLE presence alone is insufficient. A separate care-start event establishes the checkpoint.",
    actions: [...ble("ICU-B01"), a(4500, "START_CARE", "ICU-B01")],
    expected: "EVENT_NOT_DETECTED",
  },
  {
    id: "ICU-03",
    title: "An explicit exit checkpoint",
    ward: "ICU",
    description:
      "An explicit end-care workflow evaluates the pending event, not a lost BLE packet.",
    actions: [...ble("ICU-B01"), a(4500, "END_CARE", "ICU-B01")],
    expected: "EVENT_NOT_DETECTED",
  },
  {
    id: "ICU-04",
    title: "Passing a nearby bed",
    ward: "ICU",
    description:
      "One brief observation does not establish a stable zone visit.",
    actions: [
      a(0, "BLE_OBSERVATION", "ICU-B02", "D01", {
        credential: "BLE-D01",
        rssi: -78,
      }),
    ],
    expected: "INCIDENTAL_PROXIMITY",
  },
  {
    id: "ICU-05",
    title: "Between two BLE zones",
    ward: "ICU",
    description:
      "Similar signal strengths preserve uncertainty across adjacent beds.",
    actions: [
      ...ble("ICU-B01"),
      a(2800, "BLE_OBSERVATION", "ICU-B02", "D01", {
        credential: "BLE-D01",
        rssi: -53,
      }),
      a(4300, "START_CARE", "ICU-B01"),
    ],
    expected: "NEEDS_REVIEW",
  },
  {
    id: "ICU-06",
    title: "A brief signal dropout",
    ward: "ICU",
    description:
      "No immediate exit or missing-event accusation during a short packet gap.",
    actions: [...ble("ICU-B01"), a(6500, "HEARTBEAT", "ICU-B01")],
    expected: "VISIT_OPEN",
  },
  {
    id: "ICU-07",
    title: "Overlapping staff tags",
    ward: "ICU",
    description: "Two plausible staff and one activation require review.",
    actions: [
      ...ble("ICU-B01"),
      ...ble("ICU-B01", "N01").map((x) => ({ ...x, tMs: x.tMs + 3000 })),
      a(6500, "DISPENSER_ACTIVATE", "ICU-B01"),
    ],
    expected: "NEEDS_REVIEW",
  },
  {
    id: "ICU-08",
    title: "An untagged visitor",
    ward: "ICU",
    description:
      "A visitor is visible in the demonstration, but no BLE identity is fabricated.",
    actions: [a(0, "MOVE_ACTOR", "ICU-B02", "V01")],
    expected: "MOVEMENT_ONLY",
  },
  {
    id: "SYS-01",
    title: "A dispenser sensor fault",
    ward: "SYSTEM",
    description:
      "An unavailable sensor produces a data gap rather than a missing-event finding.",
    actions: [
      tap(0, "GW-B01"),
      a(1500, "DEVICE_FAULT", "GW-B01"),
      tap(4000, "GW-B02"),
      a(5000, "DEVICE_RECOVER", "GW-B01"),
    ],
    expected: "DATA_GAP",
  },
  {
    id: "SYS-02",
    title: "Offline queue & reconciliation",
    ward: "SYSTEM",
    description:
      "Queue a dispenser observation through an outage and replay its unchanged event ID.",
    actions: [
      tap(0, "GW-B01"),
      a(1500, "NETWORK_DOWN", "GW-B01"),
      a(2500, "DISPENSER_ACTIVATE", "GW-B01"),
      a(4500, "NETWORK_UP", "GW-B01"),
      tap(6000, "GW-B02"),
    ],
    expected: "DATA_GAP",
  },
  {
    id: "SYS-03",
    title: "Emergency care continues",
    ward: "SYSTEM",
    description:
      "An authorized reviewer records a reasoned exception; the original evidence remains intact.",
    actions: [
      tap(0, "GW-B01"),
      a(1500, "START_CARE", "GW-B01"),
      a(3500, "AUTHORIZE_OVERRIDE", "GW-B01", "D01", {
        reason:
          "Simulated emergency intervention; care proceeded without delay.",
      }),
    ],
    expected: "OVERRIDE_RECORDED",
  },
  {
    id: "TECH-01",
    title: "Eight guided steps",
    ward: "SYSTEM",
    description:
      "A guided-only station session records all eight unknown estimates without claiming camera validation.",
    actions: Array.from({ length: 8 }, (_, i) =>
      a(i * 1200, "GUIDANCE_STEP", "STATION", "D01", { step: i + 1 }),
    ),
    expected: "UNABLE_TO_ASSESS",
  },
  {
    id: "TECH-02",
    title: "Camera cannot assess",
    ward: "SYSTEM",
    description:
      "Camera failure produces an explicit unable-to-assess session and keeps manual guidance available.",
    actions: [a(0, "CAMERA_UNAVAILABLE", "STATION")],
    expected: "UNABLE_TO_ASSESS",
  },
  {
    id: "SEC-01",
    title: "A restricted export attempt",
    ward: "SYSTEM",
    description:
      "Scripted clinician export permission check: denied and audited. Actual API role enforcement is separately tested.",
    actions: [a(0, "PERMISSION_CHECK", "GW-B01")],
    expected: "PERMISSION_DENIED",
  },
];
