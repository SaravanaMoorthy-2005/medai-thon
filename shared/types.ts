import { z } from "zod";
export const roles = [
  "CLINICIAN",
  "SUPERVISOR",
  "INFECTION_PREVENTION",
  "BIOMEDICAL",
  "ADMIN",
  "AUDITOR",
] as const;
export type Role = (typeof roles)[number];
export type Ward = "GENERAL" | "ICU";
export type Status =
  | "HYGIENE_PENDING"
  | "VISIT_OPEN"
  | "EVENT_ASSOCIATED"
  | "EVENT_NOT_DETECTED"
  | "NEEDS_REVIEW"
  | "DATA_GAP"
  | "OVERRIDE_RECORDED"
  | "RESOLVED";
export const eventSchema = z.object({
  id: z.string().min(1).max(120),
  deviceId: z.string().min(1).max(100),
  deviceTime: z.string().datetime(),
  type: z.enum([
    "RFID_SCAN",
    "BLE_OBSERVATION",
    "DISPENSER_ACTIVATE",
    "START_CARE",
    "END_CARE",
    "CHECKPOINT",
    "DEVICE_FAULT",
    "DEVICE_RECOVER",
    "NETWORK_DOWN",
    "NETWORK_UP",
    "MOVE_ACTOR",
    "HEARTBEAT",
    "AUTHORIZE_OVERRIDE",
    "GUIDANCE_STEP",
    "CAMERA_UNAVAILABLE",
    "PERMISSION_CHECK",
  ]),
  source: z.enum(["SIMULATED", "HARDWARE", "MANUAL"]).default("SIMULATED"),
  credential: z.string().max(100).optional(),
  staffId: z.string().max(80).optional(),
  bedId: z.string().max(80).optional(),
  rssi: z.number().min(-120).max(0).optional(),
  runId: z.string().optional(),
  dedupeKey: z.string().optional(),
  action: z.enum(["walk", "tap", "press", "care", "idle", "rub"]).optional(),
  actorRole: z.enum(roles).optional(),
  reason: z.string().max(1000).optional(),
  step: z.number().int().min(1).max(8).optional(),
});
export type InputEvent = z.infer<typeof eventSchema>;
export interface Observation extends InputEvent {
  receivedTime: string;
  sequence: number;
  classification: string;
}
export interface Bed {
  id: string;
  ward: Ward;
  name: string;
  active: boolean;
  position: [number, number, number];
}
export interface Staff {
  id: string;
  name: string;
  role: string;
  color: string;
}
export interface Credential {
  id: string;
  staffId: string;
  kind: "RFID" | "BLE";
  revoked: boolean;
}
export interface Device {
  id: string;
  kind: "RFID" | "BLE" | "DISPENSER" | "WORKFLOW" | "STATION";
  bedId: string;
  status: "ONLINE" | "OFFLINE" | "FAULT";
  lastSeen: string | null;
  firmware: string;
  source: "SIMULATED";
}
export interface Visit {
  id: string;
  staffId: string;
  bedId: string;
  startAt: string;
  endAt: string | null;
  entryEventId: string;
  runId?: string;
  zoneConfidence: number;
  uncertain: boolean;
}
export interface Opportunity {
  id: string;
  visitId: string;
  bedId: string;
  staffId: string;
  status: Status;
  policyVersion: string;
  checkpoint: string;
  evidence: string[];
  identityConfidence: number;
  zoneConfidence: number;
  opportunityConfidence: number;
  associationConfidence: number;
  reason: string;
  runId?: string;
}
export interface Activation {
  id: string;
  eventId: string;
  bedId: string;
  time: string;
  status: "UNMATCHED" | "NEEDS_REVIEW" | "EVENT_ASSOCIATED";
  opportunityId: string | null;
  candidates: string[];
}
export interface Alert {
  id: string;
  opportunityId: string;
  bedId: string;
  type: string;
  state:
    | "OPEN"
    | "ACKNOWLEDGED"
    | "UNDER_REVIEW"
    | "RESOLVED"
    | "CLOSED_WITH_EXCEPTION";
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  actor?: string;
  reason?: string;
  severity: "warning" | "critical";
}
export interface Audit {
  id: string;
  sequence: number;
  entityId: string;
  type: string;
  oldState: string | null;
  newState: string;
  reason: string;
  actor: string;
  time: string;
  deviceTime: string;
  eventId: string | null;
  correlationId: string;
  policyVersion: string;
}
export interface Policy {
  version: string;
  matchingWindowMs: number;
  bleWindowMs: number;
  bleMinSamples: number;
  bleMargin: number;
  alertCooldownMs: number;
  retentionDays: number;
  steps: string[];
  protocolVersion: string;
  approved: false;
}
export interface ScenarioAction {
  tMs: number;
  type: InputEvent["type"];
  bedId: string;
  staffId?: string;
  credential?: string;
  rssi?: number;
  action?: InputEvent["action"];
  step?: number;
  reason?: string;
}
export interface Scenario {
  id: string;
  title: string;
  ward: Ward | "SYSTEM";
  description: string;
  actions: ScenarioAction[];
  expected: string;
}
export interface Run {
  id: string;
  scenarioId: string;
  startedAt: string;
  status: "RUNNING" | "PAUSED" | "COMPLETED";
  cursor: number;
  elapsedMs: number;
  speed: number;
  lastTick: number;
  actorRole?: Role;
}
export interface ActorState {
  id: string;
  bedId: string;
  action: NonNullable<InputEvent["action"]>;
  changedAt: string;
}
export interface Technique {
  id: string;
  startedAt: string;
  endedAt: string | null;
  protocolVersion: string;
  runId?: string;
  steps: {
    index: number;
    result: "OBSERVED" | "UNKNOWN";
    confidence: number;
    at: string;
  }[];
  result:
    | "IN_PROGRESS"
    | "UNABLE_TO_ASSESS"
    | "RETRY_RECOMMENDED"
    | "ASSESSMENT_COMPLETED";
}
export interface Validation {
  id: string;
  runId: string;
  expected: string;
  predicted: string;
  matches: boolean;
  observer: string;
  at: string;
  method: "SCRIPTED" | "MANUAL";
}
export interface Snapshot {
  sequence: number;
  beds: Bed[];
  staff: Staff[];
  credentials: Credential[];
  devices: Device[];
  visits: Visit[];
  opportunities: Opportunity[];
  events: Observation[];
  activations: Activation[];
  alerts: Alert[];
  audit: Audit[];
  policy: Policy;
  runs: Run[];
  actors: ActorState[];
  techniques: Technique[];
  validations: Validation[];
  networkOnline: boolean;
  queuedEvents: InputEvent[];
}
export const defaultSteps = [
  "Prepare at the shared station",
  "Apply product following local protocol",
  "Demonstrate palm movement",
  "Demonstrate back-of-hand movement",
  "Demonstrate finger movement",
  "Demonstrate thumb movement",
  "Demonstrate fingertip movement",
  "Complete the local drying procedure",
];
export const titleCase = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
export function deviceFor(type: InputEvent["type"], bedId: string): string {
  return `${bedId}-${type === "RFID_SCAN" ? "RFID" : type === "BLE_OBSERVATION" ? "BLE" : type === "DISPENSER_ACTIVATE" ? "DISP" : "FLOW"}`;
}
