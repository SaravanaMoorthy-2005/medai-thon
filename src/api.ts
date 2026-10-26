import { create } from "zustand";
import type { Snapshot, Role, InputEvent } from "../shared/types";
import { Engine, type StateStore } from "../shared/engine";
import { initialState } from "../shared/initialState";
import { scenarios } from "../shared/scenarios";

class LocalStorageStore implements StateStore {
  load(): Snapshot {
    try {
      const saved = localStorage.getItem("hygiene_os_simulation_state");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return initialState();
  }
  save(state: Snapshot): void {
    try {
      localStorage.setItem("hygiene_os_simulation_state", JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

let localEngine: Engine | undefined;
let localTimer: ReturnType<typeof setInterval> | undefined;
let isLocalMode = false;

export function getLocalEngine(): Engine {
  if (!localEngine) {
    localEngine = new Engine(new LocalStorageStore());
    localEngine.onChange = () => {
      useApp.getState().set({ state: { ...localEngine!.state } });
    };
  }
  return localEngine;
}

function handleLocalApi<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const engine = getLocalEngine();
  const role = useApp.getState().role;

  if (path === "/session") {
    return Promise.resolve({ role } as unknown as T);
  }
  if (path === "/state") {
    return Promise.resolve(engine.state as unknown as T);
  }
  if (path === "/scenarios") {
    return Promise.resolve(scenarios as unknown as T);
  }
  if (path === "/events") {
    return Promise.resolve(engine.ingest(body as InputEvent) as unknown as T);
  }
  if (path.startsWith("/scenarios/") && path.endsWith("/run")) {
    const id = path.split("/")[2];
    return Promise.resolve(engine.startRun(id, role) as unknown as T);
  }
  if (path.startsWith("/runs/")) {
    const parts = path.split("/");
    const id = parts[2];
    const action = parts[3] as "pause" | "resume" | "step" | "speed";
    const speed = (body as { speed?: number })?.speed || 1;
    return Promise.resolve(engine.runAction(id, action, speed) as unknown as T);
  }
  if (path.startsWith("/alerts/")) {
    const parts = path.split("/");
    const id = parts[2];
    const action = parts[3] as "acknowledge" | "review" | "escalate" | "resolve" | "override";
    const reason = (body as { reason?: string })?.reason || "Action acknowledged by supervisor";
    return Promise.resolve(engine.alertAction(id, action, reason, role) as unknown as T);
  }
  if (path === "/validation") {
    const vBody = body as { runId: string; expected: string; method: "SCRIPTED" | "MANUAL" };
    const predicted = engine.prediction(vBody.runId);
    const v = {
      id: crypto.randomUUID(),
      ...vBody,
      predicted,
      matches: predicted === vBody.expected,
      observer: `demo-${role}`,
      at: new Date().toISOString(),
    };
    engine.state.validations.push(v);
    engine.audit(
      "VALIDATION",
      v.id,
      v.matches ? "MATCH" : "MISMATCH",
      "Truth stored separately; not used by prediction engine.",
      undefined,
      null,
      v.observer,
    );
    engine.save();
    return Promise.resolve(v as unknown as T);
  }
  if (path === "/beds" && (!method || method === "POST")) {
    const bBody = body as { ward: "GENERAL" | "ICU"; name: string };
    const idx = engine.state.beds.filter((b) => b.ward === bBody.ward).length;
    const id = bBody.ward === "GENERAL" ? `GW-B0${idx + 1}` : `ICU-B0${idx + 1}`;
    const bed = {
      id,
      ward: bBody.ward,
      name: bBody.name,
      active: true,
      position: (bBody.ward === "GENERAL"
        ? [-7.5 + (idx % 2) * 4, 0, -4 + Math.floor(idx / 2) * 5]
        : [4.1 + idx * 3.8, 0, -2.8]) as [number, number, number],
    };
    engine.state.beds.push(bed);
    for (const k of [bBody.ward === "GENERAL" ? "RFID" : "BLE", "DISPENSER", "WORKFLOW"] as const) {
      engine.state.devices.push({
        id: `${bed.id}-${k === "DISPENSER" ? "DISP" : k === "WORKFLOW" ? "FLOW" : k}`,
        kind: k,
        bedId: bed.id,
        status: "ONLINE",
        lastSeen: null,
        firmware: "sim-2.0",
        source: "SIMULATED",
      });
    }
    engine.audit("BED_CONFIGURED", bed.id, "ACTIVE", "Demo bed added to hospital configuration.");
    engine.save();
    return Promise.resolve(bed as unknown as T);
  }
  if (path.startsWith("/beds/") && method === "PATCH") {
    const id = path.split("/")[2];
    const bed = engine.state.beds.find((b) => b.id === id);
    if (bed) {
      bed.active = (body as { active: boolean }).active;
      engine.audit("BED_CONFIGURED", bed.id, bed.active ? "ACTIVE" : "INACTIVE", "Demo bed state updated.");
      engine.save();
    }
    return Promise.resolve(bed as unknown as T);
  }
  if (path === "/credentials" && (!method || method === "POST")) {
    const cBody = body as { id: string; staffId: string; kind: "RFID" | "BLE" };
    const cred = { ...cBody, revoked: false };
    engine.state.credentials.push(cred);
    engine.audit("CREDENTIAL_ENROLLED", cred.id, "ACTIVE", "Demo credential enrolled.");
    engine.save();
    return Promise.resolve(cred as unknown as T);
  }
  if (path.startsWith("/credentials/") && path.endsWith("/revoke")) {
    const id = path.split("/")[2];
    const c = engine.state.credentials.find((x) => x.id === id);
    if (c) {
      c.revoked = true;
      engine.audit("CREDENTIAL_REVOKED", c.id, "REVOKED", "Demo credential revoked.");
      engine.save();
    }
    return Promise.resolve(c as unknown as T);
  }
  if (path === "/policy") {
    Object.assign(engine.state.policy, body, { version: `v${Date.now()}` });
    if ((body as { steps?: unknown })?.steps) {
      engine.state.policy.protocolVersion = `demo-${Date.now()}`;
    }
    engine.audit("POLICY_UPDATE", "policy", "UPDATED", "Policy updated.");
    engine.save();
    return Promise.resolve(engine.state.policy as unknown as T);
  }
  if (path.startsWith("/technique/") && path.endsWith("/step")) {
    const id = path.split("/")[2];
    const sBody = body as { index: number; result: "OBSERVED" | "UNKNOWN"; confidence?: number };
    let t = engine.state.techniques.find((x) => x.id === id);
    if (!t) {
      t = {
        id,
        startedAt: new Date().toISOString(),
        endedAt: null,
        protocolVersion: engine.state.policy.protocolVersion,
        steps: [],
        result: "IN_PROGRESS",
      };
      engine.state.techniques.push(t);
    }
    t.steps.push({
      index: sBody.index,
      result: sBody.result || "UNKNOWN",
      confidence: sBody.confidence ?? 0.85,
      at: new Date().toISOString(),
    });
    if (t.steps.length === 8) {
      t.endedAt = new Date().toISOString();
      t.result = t.steps.some((s) => s.result === "UNKNOWN")
        ? "UNABLE_TO_ASSESS"
        : "RETRY_RECOMMENDED";
    }
    engine.audit("TECHNIQUE_STEP", t.id, t.result, `Step ${sBody.index}: ${sBody.result}.`);
    engine.save();
    return Promise.resolve(t as unknown as T);
  }
  if (path === "/reset") {
    try {
      localStorage.removeItem("hygiene_os_simulation_state");
    } catch {
      // ignore
    }
    engine.state = initialState();
    engine.save();
    return Promise.resolve({ ok: true } as unknown as T);
  }

  return Promise.resolve({} as unknown as T);
}

export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  if (isLocalMode) {
    return handleLocalApi<T>(path, body, method);
  }
  const r = await fetch(`/api${path}`, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: "Invalid response from server" };
  }
  if (!r.ok) {
    throw new Error(data.error || `Request failed with status ${r.status}`);
  }
  return data as T;
}

interface AppStore {
  state: Snapshot | null;
  role: Role;
  connection: "CONNECTING" | "LIVE" | "RECONNECTING";
  error: string;
  selected: string;
  module: number;
  ward: "ALL" | "GENERAL" | "ICU";
  set: (p: Partial<AppStore>) => void;
}

export const useApp = create<AppStore>((set) => ({
  state: null,
  role: "SUPERVISOR",
  connection: "CONNECTING",
  error: "",
  selected: "GW-B01",
  module: 0,
  ward: "ALL",
  set,
}));

let socket: WebSocket | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;

export async function login(role: Role) {
  if (isLocalMode) {
    const engine = getLocalEngine();
    engine.audit(
      "DEMO_LOGIN",
      `demo-${role}`,
      role,
      "Local demo role session; in-browser simulation.",
      undefined,
      null,
      `demo-${role}`,
    );
    engine.save();
    useApp.getState().set({ role });
    return;
  }
  await api("/auth/login", { role });
  useApp.getState().set({ role });
  if (socket) {
    socket.onclose = null;
    socket.close();
  }
  if (retry) clearTimeout(retry);
  connect();
}

export async function initialize() {
  // Check if live backend server is running and returning JSON
  try {
    const res = await fetch("/api/session", { credentials: "include" });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const session = await res.json();
      if (session && session.role) {
        useApp.getState().set({ role: session.role });
        connect();
        return;
      }
    }
  } catch {
    // Backend unreachable
  }

  try {
    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: "SUPERVISOR" }),
    });
    const contentType = loginRes.headers.get("content-type") || "";
    if (loginRes.ok && contentType.includes("application/json")) {
      useApp.getState().set({ role: "SUPERVISOR" });
      connect();
      return;
    }
  } catch {
    // Backend unreachable
  }

  // Activate in-browser simulation mode for Vercel / static hosting
  initLocalSimulation();
}

function initLocalSimulation() {
  isLocalMode = true;
  const engine = getLocalEngine();
  useApp.getState().set({
    state: { ...engine.state },
    role: "SUPERVISOR",
    connection: "LIVE",
    error: "",
  });

  if (localTimer) clearInterval(localTimer);
  localTimer = setInterval(() => {
    if (localEngine) {
      localEngine.tick();
    }
  }, 200);
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/api/live`);
  socket.onopen = () => useApp.getState().set({ connection: "LIVE" });
  socket.onmessage = (e) => {
    try {
      const message = JSON.parse(e.data) as {
        sequence: number;
        snapshot: Snapshot;
      };
      const old = useApp.getState().state;
      if (!old || message.sequence >= old.sequence)
        useApp.getState().set({ state: message.snapshot });
    } catch {
      // ignore
    }
  };
  socket.onclose = () => {
    useApp.getState().set({ connection: "RECONNECTING" });
    retry = setTimeout(reconnect, 2000);
  };
  socket.onerror = () => socket?.close();
}

async function reconnect() {
  try {
    await api("/session");
    connect();
  } catch {
    try {
      await login(useApp.getState().role);
    } catch {
      retry = setTimeout(reconnect, 2000);
    }
  }
}

export async function sendEvent(
  input: Omit<InputEvent, "id" | "source" | "deviceTime">,
) {
  const event: InputEvent = {
    ...input,
    id: crypto.randomUUID(),
    source: "SIMULATED",
    deviceTime: new Date().toISOString(),
  };
  if (isLocalMode) {
    return Promise.resolve(getLocalEngine().ingest(event));
  }
  return api("/events", event);
}

export async function downloadEvidenceCsv(ward: string) {
  if (isLocalMode) {
    const engine = getLocalEngine();
    const rows = engine.state.events.filter(
      (e) =>
        ward === "ALL" ||
        engine.state.beds.find((b) => b.id === e.bedId)?.ward === ward,
    );
    const safe = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const csv = [
      "eventId,deviceId,deviceTime,receivedTime,source,classification,runId",
      ...rows.map((e) =>
        [
          e.id,
          e.deviceId,
          e.deviceTime,
          e.receivedTime,
          e.source,
          e.classification,
          e.runId,
        ]
          .map(safe)
          .join(","),
      ),
    ].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hygiene-evidence.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const response = await fetch(`/api/export?ward=${ward}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text();
    let err = "Export was not authorized.";
    try {
      const j = JSON.parse(text);
      err = j.error || err;
    } catch {
      // ignore
    }
    throw new Error(err);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "hygiene-evidence.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function safely(action: () => Promise<unknown>) {
  try {
    useApp.getState().set({ error: "" });
    await action();
  } catch (e) {
    useApp
      .getState()
      .set({ error: e instanceof Error ? e.message : "Operation failed." });
  }
}
