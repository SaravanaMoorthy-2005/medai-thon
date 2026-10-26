import { create } from "zustand";
import type { Snapshot, Role, InputEvent } from "../shared/types";
export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error || "Request failed");
  }
  return r.json();
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
  try {
    const session = await api<{ role: Role }>("/session");
    useApp.getState().set({ role: session.role });
    connect();
  } catch {
    await login("SUPERVISOR");
  }
}
function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}/api/live`);
  socket.onopen = () => useApp.getState().set({ connection: "LIVE" });
  socket.onmessage = (e) => {
    const message = JSON.parse(e.data) as {
      sequence: number;
      snapshot: Snapshot;
    };
    const old = useApp.getState().state;
    if (!old || message.sequence >= old.sequence)
      useApp.getState().set({ state: message.snapshot });
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
  return api("/events", {
    ...input,
    id: crypto.randomUUID(),
    source: "SIMULATED",
    deviceTime: new Date().toISOString(),
  });
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
