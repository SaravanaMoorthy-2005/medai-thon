import { Component, type ReactNode, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  Building2,
  ScanLine,
  Radio,
  GitBranch,
  FlaskConical,
  ChartNoAxesCombined,
  Bell,
  Hand,
  ShieldCheck,
  Settings2,
  Layers3,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Maximize2,
  Menu,
  CircleHelp,
  X,
  Download,
  Search,
  Cross,
  Eye,
} from "lucide-react";
import { useApp, api, login, sendEvent, safely } from "./api";
import { Hospital } from "./Hospital";
import { Hardware } from "./Hardware";
import { Technique } from "./Technique";
import { Chart } from "./Charts";
import { equipmentMetadata } from "../shared/hardware";
import { scenarios } from "../shared/scenarios";
import {
  roles,
  titleCase,
  deviceFor,
  type InputEvent,
  type Observation,
  type Role,
} from "../shared/types";

const modules = [
  ["Command Center", LayoutDashboard],
  ["3D Hospital", Building2],
  ["General Ward", ScanLine],
  ["ICU Monitoring", Radio],
  ["Opportunity Engine", GitBranch],
  ["Scenario Lab", FlaskConical],
  ["Live Analytics", ChartNoAxesCombined],
  ["Alerts & Review", Bell],
  ["Technique Station", Hand],
  ["Validation Lab", ShieldCheck],
  ["Devices & Admin", Settings2],
  ["Hardware Explorer", Layers3],
] as const;
const descriptions = [
  "A clear view of your hospital’s hygiene workflows.",
  "Every space. Every observation. One connected view.",
  "Intentional badge taps. Explainable bedside workflows.",
  "Estimated proximity, with uncertainty kept in view.",
  "Follow each interpretation back to its source evidence.",
  "Reproducible workflows. Real events. Inspectable outcomes.",
  "A live picture, built from persistent observations.",
  "Review evidence with context. Keep care moving.",
  "Private, shared guidance for a considered routine.",
  "Separate observed truth from engine predictions.",
  "Configure your environment and protect its evidence.",
  "Inside the bedside systems. Every connection explained.",
];
const roleNames: Record<Role, string> = {
  CLINICIAN: "Doctor / Nurse",
  SUPERVISOR: "Ward Supervisor",
  INFECTION_PREVENTION: "Infection Prevention",
  BIOMEDICAL: "Biomedical / IT",
  ADMIN: "Administrator",
  AUDITOR: "Auditor",
};
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`pill ${status.includes("NOT_DETECTED") || status === "OPEN" ? "amber" : status.includes("REVIEW") ? "amber" : status.includes("GAP") || status.includes("FAULT") ? "red" : status.includes("ASSOCIATED") || status === "ONLINE" ? "green" : ""}`}
    >
      {titleCase(status)}
    </span>
  );
}
function Empty({
  text = "No observations yet. Run a scenario or use the bedside controls.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Activity size={26} />
      <p>{text}</p>
    </div>
  );
}
export class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <Building2 size={40} />
        <h3>3D rendering is unavailable</h3>
        <p>Use the bed list to inspect records and run the same workflows.</p>
      </div>
    ) : (
      this.props.children
    );
  }
}
function EventTable({
  events,
  compact = false,
}: {
  events: Observation[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<Observation | null>(null);
  return (
    <>
      {events.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Observation</th>
                <th>Location / device</th>
                {!compact && <th>Interpretation</th>}
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events
                .slice()
                .reverse()
                .slice(0, compact ? 5 : 100)
                .map((e) => (
                  <tr key={e.id}>
                    <td className="mono">
                      {new Date(e.receivedTime).toLocaleTimeString("en-GB")}
                    </td>
                    <td>{titleCase(e.type)}</td>
                    <td className="mono">{e.deviceId}</td>
                    {!compact && (
                      <td>
                        <Badge status={e.classification} />
                      </td>
                    )}
                    <td>
                      <span className="source-label">{e.source}</span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Inspect event ${e.id}`}
                        onClick={() => setSelected(e)}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="section-heading">
              <h2>Source observation</h2>
              <button
                aria-label="Close event"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <dl>
              {Object.entries(selected).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="mono">{String(v)}</dd>
                </div>
              ))}
            </dl>
            <p className="info-note">
              Original observation is immutable. Interpretation and subsequent
              transitions are recorded separately in the audit log.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
function Metrics() {
  const { state, ward } = useApp();
  if (!state) return null;
  const beds = state.beds
    .filter((b) => ward === "ALL" || b.ward === ward)
    .map((b) => b.id);
  const opportunities = state.opportunities.filter((o) =>
    beds.includes(o.bedId),
  );
  const items = [
    [
      "Active visits",
      state.visits.filter((v) => !v.endAt && beds.includes(v.bedId)).length,
      "Open workflow records",
    ],
    [
      "Associated activations",
      opportunities.filter((o) => o.status === "EVENT_ASSOCIATED").length,
      "Estimated opportunities",
    ],
    [
      "Needs attention",
      state.alerts.filter(
        (a) =>
          !["RESOLVED", "CLOSED_WITH_EXCEPTION"].includes(a.state) &&
          beds.includes(a.bedId),
      ).length,
      "Open review queue",
    ],
    [
      "Observation coverage",
      `${state.devices.filter((d) => d.status === "ONLINE" && beds.includes(d.bedId)).length}/${state.devices.filter((d) => beds.includes(d.bedId)).length}`,
      "Simulated devices online",
    ],
  ];
  return (
    <div className="metrics">
      {items.map(([label, value, sub]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{sub}</small>
        </div>
      ))}
    </div>
  );
}
function CommandCenter() {
  const { state, set } = useApp();
  if (!state) return null;
  return (
    <>
      <Metrics />
      <div className="command-layout">
        <section className="panel welcome">
          <div className="eyebrow">HOSPITAL OVERVIEW / LEVEL 01</div>
          <h2>
            Connected spaces.
            <br />
            Considered care.
          </h2>
          <p>
            Explore the wards, inspect a bedside workflow, or follow an
            observation from device to decision.
          </p>
          <button
            className="primary"
            onClick={() => set({ module: 1, ward: "ALL" })}
          >
            Enter the digital twin <ArrowUpRight size={17} />
          </button>
          <div className="welcome-meta">
            <span>
              {
                state.beds.filter((b) => b.ward === "GENERAL" && b.active)
                  .length
              }{" "}
              RFID beds
            </span>
            <span>
              {state.beds.filter((b) => b.ward === "ICU" && b.active).length}{" "}
              BLE zones
            </span>
            <span>1 shared station</span>
          </div>
        </section>
        <div className="overview-scene">
          <SceneBoundary>
            <Hospital />
          </SceneBoundary>
        </div>
      </div>
      <div className="ward-cards">
        {(["GENERAL", "ICU"] as const).map((w, i) => (
          <button
            className={`ward-card ${i ? "icu" : ""}`}
            key={w}
            onClick={() =>
              set({
                module: i ? 3 : 2,
                ward: w,
                selected: i ? "ICU-B01" : "GW-B01",
              })
            }
          >
            <div className="ward-symbol">
              {i ? <Radio size={26} /> : <ScanLine size={26} />}
            </div>
            <div>
              <span className="eyebrow">
                {i ? "PROXIMITY / BLE" : "IDENTIFICATION / RFID"}
              </span>
              <h2>{i ? "Intensive Care Unit" : "General Ward"}</h2>
              <p>
                {state.beds.filter((b) => b.ward === w && b.active).length}{" "}
                {i ? "configured zones" : "configured beds"} ·{" "}
                {
                  state.visits.filter(
                    (v) => !v.endAt && v.bedId.startsWith(i ? "ICU" : "GW"),
                  ).length
                }{" "}
                active visits
              </p>
            </div>
            <ArrowUpRight size={23} />
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <h3>Latest observations</h3>
          <button className="text-button" onClick={() => set({ module: 4 })}>
            Explore evidence <ChevronRight size={15} />
          </button>
        </div>
        <EventTable events={state.events} compact />
      </section>
    </>
  );
}
function BedInspector() {
  const { state, selected, set } = useApp();
  const [staff, setStaff] = useState("D01");
  if (!state) return null;
  const bed = state.beds.find((b) => selected.startsWith(b.id));
  const station = selected === "STATION";
  const device = state.devices.find((d) => d.id === selected);
  const o = state.opportunities.filter((o) => o.bedId === bed?.id).at(-1);
  const active = state.visits.filter(
    (v) => !v.endAt && v.bedId === bed?.id && !v.runId,
  );
  const dispatch = (type: InputEvent["type"]) =>
    safely(async () => {
      if (!bed) return;
      const payload = {
        type,
        deviceId: deviceFor(type, bed.id),
        bedId: bed.id,
        staffId: staff,
      };
      if (type === "BLE_OBSERVATION") {
        for (let i = 0; i < 3; i++)
          await sendEvent({
            ...payload,
            credential: `BLE-${staff}`,
            rssi: -52,
          });
      } else
        await sendEvent({
          ...payload,
          ...(type === "RFID_SCAN" ? { credential: `RFID-${staff}` } : {}),
        });
    });
  return (
    <aside className="inspector">
      <div className="eyebrow">
        {station
          ? "SHARED GUIDANCE STATION"
          : device
            ? "DEVICE INSPECTOR"
            : "SPACE INSPECTOR"}
      </div>
      <div className="inspector-title">
        <h2>
          {station ? "Technique station" : bed?.id || "Hospital overview"}
        </h2>
        <span className={`ward-dot ${bed?.ward === "ICU" ? "teal" : ""}`} />
      </div>
      <p className="subtle">
        {station
          ? "One private, shared camera station"
          : bed?.ward === "ICU"
            ? "Intensive care · estimated BLE zone"
            : "General ward · intentional RFID checkpoint"}
      </p>
      {o ? (
        <Badge status={o.status} />
      ) : (
        <span className="pill">Awaiting observations</span>
      )}
      {station ? (
        <>
          <div className="info-note">
            Camera only here. No raw video storage and no bedside surveillance.
          </div>
          <button className="primary" onClick={() => set({ module: 8 })}>
            Open guidance station
          </button>
        </>
      ) : (
        <>
          <div className="inspector-section">
            <h4>Bedside equipment</h4>
            {state.devices
              .filter((d) => d.bedId === bed?.id)
              .map((d) => (
                <button
                  className={
                    selected === d.id ? "device-row selected" : "device-row"
                  }
                  key={d.id}
                  onClick={() => set({ selected: d.id })}
                >
                  <span>
                    {d.kind === "DISPENSER" ? (
                      <Hand size={15} />
                    ) : d.kind === "BLE" ? (
                      <Radio size={15} />
                    ) : (
                      <ScanLine size={15} />
                    )}
                    <span>
                      {titleCase(d.kind)}
                      <small>{d.id}</small>
                    </span>
                  </span>
                  <i
                    className={
                      d.status === "ONLINE" ? "health-dot" : "health-dot fault"
                    }
                  />
                </button>
              ))}
          </div>
          <div className="inspector-section">
            <h4>
              Interact with this space{" "}
              <span className="source-label">SIMULATED</span>
            </h4>
            <label>
              Staff identity
              <select value={staff} onChange={(e) => setStaff(e.target.value)}>
                {state.staff
                  .filter((s) => s.role !== "Visitor")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.id}
                    </option>
                  ))}
              </select>
            </label>
            <div className="control-stack">
              <button
                className="primary"
                onClick={() =>
                  dispatch(
                    bed?.ward === "ICU" ? "BLE_OBSERVATION" : "RFID_SCAN",
                  )
                }
              >
                {bed?.ward === "ICU" ? (
                  <Radio size={16} />
                ) : (
                  <ScanLine size={16} />
                )}{" "}
                {bed?.ward === "ICU"
                  ? "Observe tag · 3 samples"
                  : "Tap registered badge"}
              </button>
              <button onClick={() => dispatch("DISPENSER_ACTIVATE")}>
                <Hand size={16} />
                Activate dispenser
              </button>
              <button onClick={() => dispatch("START_CARE")}>
                <Activity size={16} />
                Explicit care checkpoint
              </button>
            </div>
          </div>
          {device && bed && equipmentMetadata(device.kind, bed.ward) && (
            <div className="info-note">
              <strong>{equipmentMetadata(device.kind, bed.ward)?.name}</strong>
              <p>{equipmentMetadata(device.kind, bed.ward)?.description}</p>
              {equipmentMetadata(device.kind, bed.ward)?.limitation}
            </div>
          )}
          <div className="inspector-section">
            <h4>Workflow context</h4>
            <dl>
              <dt>Manual active staff</dt>
              <dd>{active.map((v) => v.staffId).join(", ") || "None"}</dd>
              <dt>Opportunity estimate</dt>
              <dd>
                {o
                  ? `${Math.round(o.opportunityConfidence * 100)} / 100 heuristic`
                  : "Not established"}
              </dd>
              <dt>Selected device</dt>
              <dd>{device?.status || "Choose equipment"}</dd>
            </dl>
          </div>
          <div className="info-note">
            {bed?.ward === "ICU"
              ? "BLE estimates proximity. A separate workflow checkpoint is required; patient contact is never inferred from signal alone."
              : "The same staff’s next bed scan evaluates the preceding visit. A dispenser activation does not establish hygiene quality."}
          </div>
          <button className="text-button" onClick={() => set({ module: 11 })}>
            Inspect hardware assembly <ArrowUpRight size={15} />
          </button>
        </>
      )}
    </aside>
  );
}
function Timeline() {
  const { state } = useApp();
  const run = state?.runs.at(-1);
  const scenario = scenarios.find((s) => s.id === run?.scenarioId);
  return (
    <section className="timeline">
      <div className="timeline-heading">
        <span>
          <span className="eyebrow">SIMULATION TIMELINE</span>
          <strong>
            {scenario?.title || "Your next observation starts here"}
          </strong>
        </span>
        <div className="button-row">
          {run ? (
            <>
              <button
                aria-label={
                  run.status === "RUNNING"
                    ? "Pause scenario"
                    : "Resume scenario"
                }
                disabled={run.status === "COMPLETED"}
                onClick={() =>
                  safely(() =>
                    api(
                      `/runs/${run.id}/${run.status === "RUNNING" ? "pause" : "resume"}`,
                      {},
                    ),
                  )
                }
              >
                {run.status === "RUNNING" ? (
                  <Pause size={15} />
                ) : (
                  <Play size={15} />
                )}
              </button>
              <button
                title="Step scenario"
                disabled={run.status === "COMPLETED"}
                onClick={() => safely(() => api(`/runs/${run.id}/step`, {}))}
              >
                <SkipForward size={15} />
              </button>
              <select
                aria-label="Playback speed"
                value={run.speed}
                onChange={(e) =>
                  safely(() =>
                    api(`/runs/${run.id}/speed`, {
                      speed: Number(e.target.value),
                    }),
                  )
                }
              >
                {[1, 2, 4].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </>
          ) : (
            <button
              onClick={() => safely(() => api("/scenarios/GW-02/run", {}))}
            >
              <Play size={15} />
              Play next-bed scenario
            </button>
          )}
        </div>
      </div>
      {scenario && run ? (
        <>
          <div className="timeline-track">
            {scenario.actions.map((a, i) => (
              <div key={i} className={i < run.cursor ? "passed" : ""}>
                <i />
                <span>{(a.tMs / 1000).toFixed(1)}s</span>
                <strong>{titleCase(a.type)}</strong>
                <small>{a.bedId}</small>
              </div>
            ))}
          </div>
          <div className="timeline-footer">
            <span>
              {run.status} · {run.cursor}/{scenario.actions.length} observations
            </span>
            <span className="mono">
              RUN {run.id.slice(0, 8)} · persistent evidence
            </span>
          </div>
        </>
      ) : (
        <div className="timeline-empty">
          Tap a bedside badge, observe an ICU tag, or play a scripted scenario.
          Every observation is stored in SQLite.
        </div>
      )}
    </section>
  );
}
function Twin() {
  const { state, module, ward, set, selected } = useApp();
  const [view, setView] = useState("3D");
  const [reset, setReset] = useState(0);
  const [follow, setFollow] = useState("");
  const effective = module === 2 ? "GENERAL" : module === 3 ? "ICU" : ward;
  return (
    <div className="twin-workspace">
      <div className="module-toolbar">
        <div className="breadcrumb">
          <button
            onClick={() => {
              set({ ward: "ALL", module: 1 });
              setReset(reset + 1);
            }}
          >
            Hospital
          </button>
          <ChevronRight size={13} />
          <span>Level 01</span>
          <ChevronRight size={13} />
          <strong>
            {effective === "ALL"
              ? "All wards"
              : effective === "ICU"
                ? "Intensive care"
                : "General ward"}
          </strong>
        </div>
        <div className="segmented">
          {["3D", "Plan", "List"].map((v) => (
            <button
              key={v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="twin-grid">
        <div className="scene-column">
          <div className="scene-toolbar">
            <div className="segmented">
              <button
                className={effective === "ALL" ? "active" : ""}
                onClick={() => set({ module: 1, ward: "ALL" })}
              >
                Overview
              </button>
              <button
                className={effective === "GENERAL" ? "active" : ""}
                onClick={() => set({ module: 1, ward: "GENERAL" })}
              >
                General
              </button>
              <button
                className={effective === "ICU" ? "active" : ""}
                onClick={() => set({ module: 1, ward: "ICU" })}
              >
                ICU
              </button>
            </div>
            <div className="button-row">
              <select
                aria-label="Follow actor"
                value={follow}
                onChange={(e) => setFollow(e.target.value)}
              >
                <option value="">Follow actor</option>
                {state?.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button title="Reset camera" onClick={() => setReset(reset + 1)}>
                <RotateCcw size={16} />
              </button>
              <button
                title="Fullscreen"
                onClick={() =>
                  document.querySelector(".twin-workspace")?.requestFullscreen()
                }
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          <div className={`hospital-canvas ${view === "List" ? "hidden" : ""}`}>
            <SceneBoundary>
              <Hospital
                plan={view === "Plan"}
                focusWard={effective}
                reset={reset}
                follow={follow}
              />
            </SceneBoundary>
          </div>
          <div className={`bed-list-view ${view === "List" ? "visible" : ""}`}>
            {state?.beds
              .filter(
                (b) =>
                  b.active && (effective === "ALL" || b.ward === effective),
              )
              .map((b) => (
                <button
                  key={b.id}
                  onClick={() => set({ selected: b.id })}
                  className={selected.startsWith(b.id) ? "selected" : ""}
                >
                  <Building2 size={22} />
                  <strong>{b.id}</strong>
                  <span>
                    {b.name} · {b.ward}
                  </span>
                  <Badge
                    status={
                      state.opportunities.filter((o) => o.bedId === b.id).at(-1)
                        ?.status || "AWAITING_OBSERVATIONS"
                    }
                  />
                </button>
              ))}
          </div>
          <div className="scene-footer">
            <span>
              <i className="ward-dot" />
              General / RFID
            </span>
            <span>
              <i className="ward-dot teal" />
              ICU / BLE estimate
            </span>
            <span>Drag to orbit · scroll to zoom · click to inspect</span>
          </div>
          <div className="bed-selector">
            {state?.beds
              .filter(
                (b) =>
                  b.active && (effective === "ALL" || b.ward === effective),
              )
              .map((b) => (
                <button
                  key={b.id}
                  className={selected.startsWith(b.id) ? "active" : ""}
                  onClick={() => set({ selected: b.id })}
                >
                  {b.id}
                  <i
                    className={
                      state.opportunities.some(
                        (o) =>
                          o.bedId === b.id && o.status === "EVENT_NOT_DETECTED",
                      )
                        ? "health-dot fault"
                        : "health-dot"
                    }
                  />
                </button>
              ))}
            <button onClick={() => set({ selected: "STATION" })}>
              Shared station
            </button>
          </div>
        </div>
        <BedInspector />
      </div>
      <Timeline />
    </div>
  );
}
function OpportunityEngine() {
  const { state } = useApp();
  const [id, setId] = useState("");
  if (!state) return null;
  const o =
    state.opportunities.find((o) => o.id === id) || state.opportunities.at(-1);
  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-heading">
          <h3>Estimated opportunities</h3>
          <span className="count">{state.opportunities.length}</span>
        </div>
        {state.opportunities.length ? (
          state.opportunities
            .slice()
            .reverse()
            .map((o) => (
              <button
                className={`record-card ${id === o.id ? "selected" : ""}`}
                key={o.id}
                onClick={() => setId(o.id)}
              >
                <span>
                  <strong>
                    {o.bedId} / {o.staffId}
                  </strong>
                  <small>{o.checkpoint}</small>
                </span>
                <Badge status={o.status} />
              </button>
            ))
        ) : (
          <Empty />
        )}
      </section>
      <section className="panel">
        {o ? (
          <>
            <div className="eyebrow">EXPLAINABLE RULE TRACE</div>
            <h2>
              {o.bedId} · {o.staffId}
            </h2>
            <Badge status={o.status} />
            <p>{o.reason}</p>
            <div className="confidence-grid">
              {(
                [
                  ["Identity", o.identityConfidence],
                  ["Zone", o.zoneConfidence],
                  ["Opportunity", o.opportunityConfidence],
                  ["Association", o.associationConfidence],
                ] as const
              ).map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>
                    {Math.round(value * 100)}
                    <small>/100</small>
                  </strong>
                  <progress value={value} max="1" />
                </div>
              ))}
            </div>
            <p className="small subtle">
              Independent engineering confidence heuristics; not clinical
              probabilities.
            </p>
            <dl>
              <dt>Policy version</dt>
              <dd>{o.policyVersion}</dd>
              <dt>Visit</dt>
              <dd className="mono">{o.visitId}</dd>
              <dt>Scenario run</dt>
              <dd className="mono">{o.runId || "Manual simulation"}</dd>
            </dl>
            <h4>Source evidence</h4>
            <EventTable
              events={state.events.filter((e) => o.evidence.includes(e.id))}
              compact
            />
            <h4>Append-only interpretation history</h4>
            <AuditTrail entityId={o.id} />
          </>
        ) : (
          <Empty text="Open an RFID or BLE visit to inspect the evidence chain." />
        )}
      </section>
    </div>
  );
}
function AuditTrail({ entityId }: { entityId?: string }) {
  const { state } = useApp();
  return (
    <div className="audit-trail">
      {state?.audit
        .filter((a) => !entityId || a.entityId === entityId)
        .slice(-30)
        .reverse()
        .map((a) => (
          <div key={a.id}>
            <i />
            <strong>{a.type}</strong>
            <small>
              {new Date(a.time).toLocaleTimeString()} · {a.actor} · policy{" "}
              {a.policyVersion}
            </small>
            <p>
              {a.oldState ? `${a.oldState} → ` : ""}
              {a.newState}
            </p>
            <small>{a.reason}</small>
            <code>
              {a.eventId ? `Source ${a.eventId}` : `Record ${a.entityId}`}
            </code>
          </div>
        ))}
    </div>
  );
}
function ScenarioLab() {
  const { state, set } = useApp();
  const [filter, setFilter] = useState("ALL");
  return (
    <>
      <div className="section-heading">
        <p className="subtle">
          Scenarios use isolated run scopes and the same persisted ingestion
          engine as manual simulation.
        </p>
        <select
          aria-label="Scenario ward"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {["ALL", "GENERAL", "ICU", "SYSTEM"].map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </div>
      <div className="scenario-grid">
        {scenarios
          .filter((s) => filter === "ALL" || s.ward === filter)
          .map((s) => (
            <section key={s.id} className="panel scenario-card">
              <div className="section-heading">
                <span className="eyebrow">
                  {s.id} / {s.ward}
                </span>
                <span className="count">{s.actions.length} events</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <small className="subtle">Expected: {s.expected}</small>
              <div className="button-row">
                <button
                  className="primary"
                  onClick={() =>
                    safely(() => api(`/scenarios/${s.id}/run`, {}))
                  }
                >
                  <Play size={14} />
                  Run scenario
                </button>
                <button
                  onClick={() =>
                    set({
                      module: 1,
                      ward: s.ward === "SYSTEM" ? "GENERAL" : s.ward,
                      selected: s.actions[0].bedId,
                    })
                  }
                >
                  View in 3D <ArrowUpRight size={14} />
                </button>
              </div>
            </section>
          ))}
      </div>
      <Timeline />
      <section className="panel">
        <h3>Persistent runs</h3>
        {state?.runs
          .slice(-8)
          .reverse()
          .map((r) => (
            <div key={r.id} className="record-card">
              <span>
                <strong>
                  {scenarios.find((s) => s.id === r.scenarioId)?.title}
                </strong>
                <small className="mono">{r.id}</small>
              </span>
              <Badge status={r.status} />
              <button
                onClick={() =>
                  safely(() => api(`/scenarios/${r.scenarioId}/run`, {}))
                }
              >
                Replay
              </button>
            </div>
          ))}
      </section>
    </>
  );
}
function Analytics() {
  const { state, ward } = useApp();
  const [bed, setBed] = useState("ALL");
  const [device, setDevice] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [date, setDate] = useState("");
  if (!state) return null;
  const beds = state.beds.filter((b) => ward === "ALL" || b.ward === ward);
  const allowed = beds.map((b) => b.id);
  const events = state.events.filter(
    (e) =>
      allowed.includes(e.bedId || "") &&
      (bed === "ALL" || e.bedId === bed) &&
      (device === "ALL" || e.deviceId === device) &&
      (status === "ALL" || e.classification === status) &&
      (!date || e.deviceTime.startsWith(date)),
  );
  const opportunities = state.opportunities.filter(
    (o) =>
      allowed.includes(o.bedId) &&
      (bed === "ALL" || o.bedId === bed) &&
      o.evidence.some((id) => events.some((e) => e.id === id)),
  );
  const counts = beds
    .filter((b) => bed === "ALL" || b.id === bed)
    .map((b) => ({
      name: b.id,
      count: events.filter(
        (e) => e.bedId === b.id && e.type === "DISPENSER_ACTIVATE",
      ).length,
    }));
  const eligible = opportunities.filter(
    (o) =>
      o.opportunityConfidence > 0 &&
      !["DATA_GAP", "NEEDS_REVIEW"].includes(o.status),
  );
  return (
    <>
      <div className="filter-bar">
        <label>
          Bed
          <select
            aria-label="Bed"
            value={bed}
            onChange={(e) => setBed(e.target.value)}
          >
            <option value="ALL">All beds</option>
            {beds.map((b) => (
              <option key={b.id}>{b.id}</option>
            ))}
          </select>
        </label>
        <label>
          Device
          <select
            aria-label="Device"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
          >
            <option value="ALL">All devices</option>
            {state.devices
              .filter((d) => allowed.includes(d.bedId))
              .map((d) => (
                <option key={d.id}>{d.id}</option>
              ))}
          </select>
        </label>
        <label>
          Classification
          <select
            aria-label="Classification"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All classifications</option>
            {[...new Set(state.events.map((e) => e.classification))].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Device date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="button"
          onClick={() =>
            safely(async () => {
              const response = await fetch(`/api/export?ward=${ward}`, {
                credentials: "include",
              });
              if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Export was not authorized.");
              }
              const url = URL.createObjectURL(await response.blob());
              const link = document.createElement("a");
              link.href = url;
              link.download = "hygiene-evidence.csv";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            })
          }
        >
          <Download size={16} />
          Export ward evidence
        </button>
      </div>
      <div className="metrics">
        <div>
          <span>Filtered observations</span>
          <strong>{events.length}</strong>
          <small>Source records</small>
        </div>
        <div>
          <span>Activation association</span>
          <strong>
            {eligible.filter((o) => o.status === "EVENT_ASSOCIATED").length}/
            {eligible.length}
          </strong>
          <small>Eligible estimated opportunities</small>
        </div>
        <div>
          <span>Ambiguous opportunities</span>
          <strong>
            {opportunities.filter((o) => o.status === "NEEDS_REVIEW").length}
          </strong>
          <small>Excluded from eligible denominator</small>
        </div>
        <div>
          <span>Data gaps</span>
          <strong>
            {opportunities.filter((o) => o.status === "DATA_GAP").length}
          </strong>
          <small>Excluded from eligible denominator</small>
        </div>
      </div>
      <div className="two-column">
        <section className="panel">
          <h3>Observed dispenser activations</h3>
          <p className="subtle">Same filters as the evidence table below.</p>
          <Chart
            label="Activation counts by bed"
            option={{
              tooltip: { trigger: "axis" },
              grid: { left: 45, right: 20, top: 20, bottom: 48 },
              xAxis: {
                type: "category",
                data: counts.map((c) => c.name),
                axisLabel: { fontSize: 10 },
              },
              yAxis: { type: "value", minInterval: 1 },
              series: [
                {
                  type: "bar",
                  data: counts.map((c) => c.count),
                  barMaxWidth: 35,
                  itemStyle: { color: "#4b958a", borderRadius: [3, 3, 0, 0] },
                },
              ],
            }}
          />
        </section>
        <section className="panel">
          <h3>Evidence interpretation</h3>
          <Chart
            label="Opportunity states"
            option={{
              tooltip: { trigger: "axis" },
              grid: { left: 155, right: 30, top: 20, bottom: 30 },
              xAxis: { type: "value", minInterval: 1 },
              yAxis: {
                type: "category",
                data: [
                  "Associated",
                  "Pending",
                  "Not detected",
                  "Needs review",
                  "Data gap",
                ],
              },
              series: [
                {
                  type: "bar",
                  data: [
                    "EVENT_ASSOCIATED",
                    "HYGIENE_PENDING",
                    "EVENT_NOT_DETECTED",
                    "NEEDS_REVIEW",
                    "DATA_GAP",
                  ].map(
                    (s) => opportunities.filter((o) => o.status === s).length,
                  ),
                  itemStyle: { color: "#7b9cb4" },
                  barMaxWidth: 22,
                },
              ],
            }}
          />
        </section>
      </div>
      <section className="panel">
        <h3>Filtered source evidence</h3>
        <EventTable events={events} />
      </section>
      <div className="info-note">
        Activation counts are not a clinical compliance rate. Physical device
        availability, detection accuracy and clinical efficacy: NOT YET
        MEASURED.
      </div>
    </>
  );
}
function Alerts() {
  const { state } = useApp();
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("ACTIVE");
  if (!state) return null;
  const alerts = state.alerts.filter(
    (a) =>
      filter === "ALL" ||
      !["RESOLVED", "CLOSED_WITH_EXCEPTION"].includes(a.state),
  );
  const alert = state.alerts.find((a) => a.id === selected) || alerts.at(-1);
  return (
    <div className="two-column">
      <section className="panel">
        <div className="section-heading">
          <h3>
            Review queue <span className="count">{alerts.length}</span>
          </h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ACTIVE">Active reviews</option>
            <option value="ALL">All history</option>
          </select>
        </div>
        {alerts.length ? (
          alerts
            .slice()
            .reverse()
            .map((a) => (
              <button
                className="record-card"
                key={a.id}
                onClick={() => setSelected(a.id)}
              >
                <span>
                  <strong>
                    {a.bedId} · {titleCase(a.type)}
                  </strong>
                  <small>
                    {new Date(a.createdAt).toLocaleString()} · {a.severity}
                  </small>
                </span>
                <Badge status={a.state} />
              </button>
            ))
        ) : (
          <Empty text="No open alerts. Run the next-bed checkpoint scenario to create a reviewable event." />
        )}
      </section>
      <section className="panel">
        {alert ? (
          <>
            <div className="eyebrow">
              ADVISORY REVIEW / CARE REMAINS UNRESTRICTED
            </div>
            <h2>{alert.bedId}</h2>
            <Badge status={alert.state} />
            <p>
              {
                state.opportunities.find((o) => o.id === alert.opportunityId)
                  ?.reason
              }
            </p>
            <label>
              Review reason / supporting evidence
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Document your review, evidence or authorized emergency exception…"
              />
            </label>
            <div className="button-row wrap">
              {["acknowledge", "review", "escalate", "resolve", "override"].map(
                (action) => (
                  <button
                    key={action}
                    disabled={
                      reason.trim().length < 5 ||
                      ["RESOLVED", "CLOSED_WITH_EXCEPTION"].includes(
                        alert.state,
                      )
                    }
                    onClick={() =>
                      safely(() =>
                        api(`/alerts/${alert.id}/${action}`, { reason }),
                      )
                    }
                  >
                    {action === "override"
                      ? "Emergency exception"
                      : titleCase(action)}
                  </button>
                ),
              )}
            </div>
            <div className="info-note">
              Acknowledgment changes the alert review state only. Resolution and
              exception require an authorized role and a documented reason.
            </div>
            <AuditTrail entityId={alert.id} />
          </>
        ) : (
          <Empty text="Select a review to inspect its evidence and append-only history." />
        )}
      </section>
    </div>
  );
}
function Validation() {
  const { state } = useApp();
  const [runId, setRun] = useState("");
  const [truth, setTruth] = useState("EVENT_NOT_DETECTED");
  const [method, setMethod] = useState("SCRIPTED");
  if (!state) return null;
  const completed = state.runs.filter((r) => r.status === "COMPLETED");
  const records = state.validations;
  const tp = records.filter(
    (v) =>
      v.expected === "EVENT_NOT_DETECTED" &&
      v.predicted === "EVENT_NOT_DETECTED",
  ).length;
  const fp = records.filter(
    (v) =>
      v.expected !== "EVENT_NOT_DETECTED" &&
      v.predicted === "EVENT_NOT_DETECTED",
  ).length;
  const fn = records.filter(
    (v) =>
      v.expected === "EVENT_NOT_DETECTED" &&
      v.predicted !== "EVENT_NOT_DETECTED",
  ).length;
  const tn = records.length - tp - fp - fn;
  return (
    <>
      <div className="two-column">
        <section className="panel">
          <div className="eyebrow">CONTROLLED SOFTWARE VALIDATION</div>
          <h2>Evidence before claims.</h2>
          <p>
            Label a completed run independently. The rule engine never receives
            the expected outcome.
          </p>
          <label>
            Completed run
            <select
              value={runId}
              onChange={(e) => {
                setRun(e.target.value);
                const r = completed.find((r) => r.id === e.target.value);
                setTruth(
                  scenarios.find((s) => s.id === r?.scenarioId)?.expected ||
                    "EVENT_NOT_DETECTED",
                );
              }}
            >
              <option value="">Select a run</option>
              {completed.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.scenarioId} · {r.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Independent ground-truth label
            <select value={truth} onChange={(e) => setTruth(e.target.value)}>
              {[
                "EVENT_NOT_DETECTED",
                "EVENT_ASSOCIATED",
                "NEEDS_REVIEW",
                "DATA_GAP",
                "HYGIENE_PENDING",
                "VISIT_OPEN",
                "IDENTITY_UNVERIFIED",
                "MOVEMENT_ONLY",
                "INCIDENTAL_PROXIMITY",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Method
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="SCRIPTED">Scripted expectation</option>
              <option value="MANUAL">Manual observer label</option>
            </select>
          </label>
          <button
            className="primary"
            disabled={!runId}
            onClick={() =>
              safely(() =>
                api("/validation", { runId, expected: truth, method }),
              )
            }
          >
            Compare & save result
          </button>
        </section>
        <section className="panel">
          <h3>Missing-event classification</h3>
          <p className="subtle">
            Positive class = EVENT_NOT_DETECTED. Scripted software runs are not
            hardware or clinical validation.
          </p>
          <div className="confusion">
            <div>
              <span>True positive</span>
              <strong>{tp}</strong>
            </div>
            <div>
              <span>False positive</span>
              <strong>{fp}</strong>
            </div>
            <div>
              <span>False negative</span>
              <strong>{fn}</strong>
            </div>
            <div>
              <span>True negative</span>
              <strong>{tn}</strong>
            </div>
          </div>
          <dl>
            <dt>Precision</dt>
            <dd>
              {tp + fp
                ? `${((tp / (tp + fp)) * 100).toFixed(1)}%`
                : "NOT YET MEASURED"}
            </dd>
            <dt>Recall</dt>
            <dd>
              {tp + fn
                ? `${((tp / (tp + fn)) * 100).toFixed(1)}%`
                : "NOT YET MEASURED"}
            </dd>
            <dt>RFID 19/20 physical trials</dt>
            <dd>NOT YET MEASURED</dd>
            <dt>Dispenser 19/20 physical trials</dt>
            <dd>NOT YET MEASURED</dd>
          </dl>
        </section>
      </div>
      <section className="panel">
        <h3>Saved validation comparisons</h3>
        {records.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Ground truth</th>
                  <th>Engine prediction</th>
                  <th>Result</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {records.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">{v.runId.slice(0, 8)}</td>
                    <td>{v.expected}</td>
                    <td>{v.predicted}</td>
                    <td>
                      <Badge status={v.matches ? "MATCH" : "MISMATCH"} />
                    </td>
                    <td>{v.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No validation results have been recorded yet." />
        )}
      </section>
    </>
  );
}
function Admin() {
  const { state } = useApp();
  const [tab, setTab] = useState("Devices");
  const [name, setName] = useState("");
  const [ward, setWard] = useState("GENERAL");
  const [credential, setCredential] = useState("");
  const [staff, setStaff] = useState("D01");
  const [kind, setKind] = useState("RFID");
  if (!state) return null;
  return (
    <>
      <div className="module-toolbar">
        <div className="segmented">
          {[
            "Devices",
            "Configuration",
            "Credentials",
            "Protocol & Privacy",
            "Audit",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="pill">LOCAL DEMO · BACKEND ROLE CHECKS</span>
      </div>
      {tab === "Devices" ? (
        <section className="panel">
          <h3>Registered simulation devices</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Function</th>
                  <th>Health</th>
                  <th>Last received</th>
                  <th>Firmware</th>
                  <th>Diagnostics</th>
                </tr>
              </thead>
              <tbody>
                {state.devices.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.id}</td>
                    <td>{titleCase(d.kind)}</td>
                    <td>
                      <Badge status={d.status} />
                    </td>
                    <td>
                      {d.lastSeen
                        ? new Date(d.lastSeen).toLocaleTimeString()
                        : "No observations yet"}
                    </td>
                    <td>{d.firmware}</td>
                    <td>
                      {d.kind === "DISPENSER" && (
                        <button
                          onClick={() =>
                            safely(() =>
                              sendEvent({
                                type:
                                  d.status === "FAULT"
                                    ? "DEVICE_RECOVER"
                                    : "DEVICE_FAULT",
                                deviceId: `${d.bedId}-FLOW`,
                                bedId: d.bedId,
                              }),
                            )
                          }
                        >
                          {d.status === "FAULT"
                            ? "Recover sensor"
                            : "Simulate fault"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="info-note">
            All devices are simulated. Connected-hardware provisioning and
            firmware validation have not been implemented. Health is explicit
            simulated state; production heartbeat timeout monitoring remains
            unverified.
          </div>
        </section>
      ) : tab === "Configuration" ? (
        <div className="two-column">
          <section className="panel">
            <h3>Add a bed or zone</h3>
            <label>
              Ward
              <select value={ward} onChange={(e) => setWard(e.target.value)}>
                <option value="GENERAL">General Ward</option>
                <option value="ICU">ICU</option>
              </select>
            </label>
            <label>
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bed / zone display name"
              />
            </label>
            <button
              className="primary"
              disabled={name.length < 2}
              onClick={() =>
                safely(async () => {
                  await api("/beds", { ward, name });
                  setName("");
                })
              }
            >
              Create bed & devices
            </button>
            <div className="info-note">
              Initial layout: four General beds and three ICU zones. Additional
              beds use the same configuration-driven geometry and device
              registry.
            </div>
          </section>
          <section className="panel">
            <h3>Configured spaces</h3>
            {state.beds.map((b) => (
              <div className="record-card" key={b.id}>
                <span>
                  <strong>{b.id}</strong>
                  <small>
                    {b.name} · {b.active ? "Active" : "Inactive"}
                  </small>
                </span>
                <button
                  onClick={() =>
                    safely(() =>
                      api(`/beds/${b.id}`, { active: !b.active }, "PATCH"),
                    )
                  }
                >
                  {b.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </section>
        </div>
      ) : tab === "Credentials" ? (
        <div className="two-column">
          <section className="panel">
            <h3>Enroll a simulation credential</h3>
            <label>
              Credential reference
              <input
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="New pseudonymous token"
              />
            </label>
            <label>
              Staff
              <select value={staff} onChange={(e) => setStaff(e.target.value)}>
                {state.staff
                  .filter((s) => s.role !== "Visitor")
                  .map((s) => (
                    <option key={s.id}>{s.id}</option>
                  ))}
              </select>
            </label>
            <label>
              Kind
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option>RFID</option>
                <option>BLE</option>
              </select>
            </label>
            <button
              disabled={credential.length < 3}
              onClick={() =>
                safely(() =>
                  api("/credentials", { id: credential, staffId: staff, kind }),
                )
              }
            >
              Enroll credential
            </button>
          </section>
          <section className="panel">
            <h3>Credential registry</h3>
            {state.credentials.map((c) => (
              <div className="record-card" key={c.id}>
                <span>
                  <strong>{c.id}</strong>
                  <small>
                    {c.staffId} · {c.kind} · {c.revoked ? "Revoked" : "Active"}
                  </small>
                </span>
                <button
                  disabled={c.revoked}
                  onClick={() =>
                    safely(() => api(`/credentials/${c.id}/revoke`, {}))
                  }
                >
                  Revoke
                </button>
              </div>
            ))}
          </section>
        </div>
      ) : tab === "Protocol & Privacy" ? (
        <div className="two-column">
          <section className="panel">
            <h3>Demo protocol · exactly eight steps</h3>
            <ProtocolForm />
            <div className="info-note">
              Changing demo wording does not grant clinical approval. Previous
              sessions retain their protocol version.
            </div>
          </section>
          <section className="panel">
            <h3>Policy and privacy</h3>
            <label>
              Matching window (milliseconds)
              <input
                type="number"
                defaultValue={state.policy.matchingWindowMs}
                min="5000"
                max="600000"
                onBlur={(e) =>
                  safely(() =>
                    api(
                      "/policy",
                      { matchingWindowMs: Number(e.target.value) },
                      "PATCH",
                    ),
                  )
                }
              />
            </label>
            <label>
              BLE ambiguity margin (dB)
              <input
                type="number"
                defaultValue={state.policy.bleMargin}
                min="3"
                max="20"
                onBlur={(e) =>
                  safely(() =>
                    api(
                      "/policy",
                      { bleMargin: Number(e.target.value) },
                      "PATCH",
                    ),
                  )
                }
              />
            </label>
            <label>
              Requested retention (days)
              <input
                type="number"
                defaultValue={state.policy.retentionDays}
                min="1"
                max="365"
                onBlur={(e) =>
                  safely(() =>
                    api(
                      "/policy",
                      { retentionDays: Number(e.target.value) },
                      "PATCH",
                    ),
                  )
                }
              />
            </label>
            <div className="info-note">
              Retention preference is stored; automated evidence deletion is not
              enabled. Raw video is never sent to the server. Pseudonymous staff
              identifiers only. Local demo role switching is not production
              authentication.
            </div>
          </section>
        </div>
      ) : (
        <section className="panel">
          <h3>Append-only audit history</h3>
          <AuditTrail />
        </section>
      )}
    </>
  );
}
function ProtocolForm() {
  const { state } = useApp();
  const [steps, setSteps] = useState(state!.policy.steps);
  return (
    <>
      <div className="protocol-inputs">
        {steps.map((s, i) => (
          <label key={i}>
            Step {i + 1}
            <input
              value={s}
              onChange={(e) =>
                setSteps(steps.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </label>
        ))}
      </div>
      <button
        className="primary"
        onClick={() => safely(() => api("/policy", { steps }, "PATCH"))}
      >
        Save new demo protocol version
      </button>
    </>
  );
}
export default function App() {
  const { state, module, set, role, connection, error, ward } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [help, setHelp] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const ModuleIcon = modules[module][1];
  const screens = [
    <CommandCenter />,
    <Twin />,
    <Twin />,
    <Twin />,
    <OpportunityEngine />,
    <ScenarioLab />,
    <Analytics />,
    <Alerts />,
    <Technique />,
    <Validation />,
    <Admin />,
    <Hardware />,
  ];
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            set({ module: 0 });
          }}
        >
          <span className="brand-mark">
            <Cross size={21} />
          </span>
          <span>
            HYGIENE<span className="brand-os"> OS</span>
            <small>CLINICAL INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="hospital-icon">
            <Building2 size={18} />
          </span>
          <span>
            Research Hospital<small>Digital twin workspace</small>
          </span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {modules.map(([label, Icon], i) => (
            <button
              key={label}
              className={module === i ? "nav-item active" : "nav-item"}
              title={label}
              aria-label={label}
              onClick={() => {
                set({ module: i });
                if (i === 2) set({ ward: "GENERAL", selected: "GW-B01" });
                if (i === 3) set({ ward: "ICU", selected: "ICU-B01" });
              }}
            >
              <Icon size={18} strokeWidth={1.65} />
              <span>{label}</span>
              {i === 7 &&
                !!state?.alerts.filter((a) => a.state === "OPEN").length && (
                  <b>{state.alerts.filter((a) => a.state === "OPEN").length}</b>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="simulation-note">
            <i className="health-dot" />
            <div>
              Research environment<small>Controlled simulation · v2.0</small>
            </div>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="topbar-location">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu size={18} />
            </button>
            <span>Research Hospital</span>
            <ChevronRight size={13} />
            <strong>Operations</strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`live-status ${connection !== "LIVE" ? "stale" : ""}`}
            >
              <i />
              {connection === "LIVE" ? "SIMULATED LIVE" : connection}
            </span>
            <button
              className="icon-button"
              aria-label="Search beds"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Open guide"
              onClick={() => setHelp(!help)}
            >
              <CircleHelp size={18} />
            </button>
            <div className="user-avatar">{role === "ADMIN" ? "AD" : "WS"}</div>
            <select
              aria-label="Demo role"
              value={role}
              onChange={(e) => safely(() => login(e.target.value as Role))}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleNames[r]}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <ModuleIcon size={13} />
                HYGIENE OS / {String(module + 1).padStart(2, "0")}
              </div>
              <h1>{modules[module][0]}</h1>
              <p>{descriptions[module]}</p>
            </div>
            <div className="heading-actions">
              <select
                aria-label="Global ward filter"
                value={ward}
                onChange={(e) => set({ ward: e.target.value as typeof ward })}
              >
                <option value="ALL">All wards</option>
                <option value="GENERAL">General Ward</option>
                <option value="ICU">Intensive care</option>
              </select>
              <span className="date-label">
                27 OCT 2026 <span>RESEARCH PROTOTYPE</span>
              </span>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                onClick={() => set({ error: "" })}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {searchOpen && (
            <section className="search-panel">
              <input
                autoFocus
                aria-label="Find bed"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a bed or zone…"
              />
              {state?.beds
                .filter((b) =>
                  `${b.id} ${b.name}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      set({ selected: b.id, module: 1, ward: b.ward });
                      setSearchOpen(false);
                    }}
                  >
                    {b.id} · {b.name}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            </section>
          )}
          {help && (
            <div className="info-note guide">
              <Eye size={20} />
              <div>
                <strong>A working research simulation</strong>
                <p>
                  1. Open 3D Hospital and tap a badge at GW-B01. 2. Skip the
                  dispenser, select GW-B02 and tap the same badge. 3. Inspect
                  the alert, source evidence and analytics. For ICU, observe
                  three BLE samples before an explicit care checkpoint. Hardware
                  Explorer provides both interactive assemblies.
                </p>
                <a
                  href="https://imsemoo.github.io/cutaway/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Cutaway interaction reference ↗
                </a>
              </div>
              <button onClick={() => setHelp(false)} aria-label="Close guide">
                <X size={16} />
              </button>
            </div>
          )}
          {state ? (
            screens[module]
          ) : (
            <div className="loading">
              <Activity className="pulse" size={30} />
              <h2>Connecting your workspace…</h2>
              <p>Loading persistent hospital configuration and evidence.</p>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <i className="health-dot" />
            Local research prototype · No clinical compliance claims
          </span>
          <span>
            Observation ≠ contact ≠ hygiene quality{" "}
            <span className="footer-sequence">
              / SYNC {state?.sequence || 0}
            </span>
          </span>
        </footer>
      </div>
    </div>
  );
}
