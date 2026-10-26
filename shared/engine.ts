import {
  eventSchema,
  deviceFor,
  type InputEvent,
  type Observation,
  type Opportunity,
  type Role,
  type Snapshot,
  type Status,
  type Visit,
  type Run,
} from "./types";
import { scenarios } from "./scenarios";
import { initialState } from "./initialState";

const uuid = () => crypto.randomUUID();

export interface StateStore {
  load(): Snapshot;
  save(state: Snapshot): void;
  close?(): void;
  db?: any;
}

export class MemoryStore implements StateStore {
  constructor(public state: Snapshot = initialState()) {}
  load(): Snapshot {
    return this.state;
  }
  save(state: Snapshot): void {
    this.state = state;
  }
}
export class DomainError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
const sameScope = (a: { runId?: string }, b: { runId?: string }) =>
  a.runId === b.runId;
export class Engine<TStore extends StateStore = StateStore> {
  state: Snapshot;
  onChange: () => void = () => {};
  constructor(public store: TStore = new MemoryStore() as unknown as TStore) {
    this.state = store.load();
  }
  save() {
    this.store.save(this.state);
    this.onChange();
  }
  audit(
    type: string,
    entityId: string,
    newState: string,
    reason: string,
    event?: InputEvent,
    oldState: string | null = null,
    actor = "rules-engine",
  ) {
    this.state.audit.push({
      id: uuid(),
      sequence: ++this.state.sequence,
      entityId,
      type,
      newState,
      oldState,
      reason,
      actor,
      time: new Date().toISOString(),
      deviceTime: event?.deviceTime || new Date().toISOString(),
      eventId: event?.id || null,
      correlationId: event?.runId || event?.id || entityId,
      policyVersion: this.state.policy.version,
    });
  }
  authorize(role: Role, allowed: Role[], action: string) {
    if (!allowed.includes(role)) {
      this.audit(
        "PERMISSION_DENIED",
        role,
        "DENIED",
        action,
        undefined,
        null,
        `demo-${role}`,
      );
      this.save();
      throw new DomainError(
        403,
        "This demo role is not authorized for this action.",
      );
    }
  }
  transition(o: Opportunity, status: Status, reason: string, e: InputEvent) {
    const old = o.status;
    o.status = status;
    o.reason = reason;
    if (!o.evidence.includes(e.id)) o.evidence.push(e.id);
    this.audit("OPPORTUNITY_TRANSITION", o.id, status, reason, e, old);
  }
  openVisit(
    staffId: string,
    bedId: string,
    e: InputEvent,
    zoneConfidence: number,
  ) {
    const visit: Visit = {
      id: uuid(),
      staffId,
      bedId,
      startAt: e.deviceTime,
      endAt: null,
      entryEventId: e.id,
      zoneConfidence,
      uncertain: false,
      runId: e.runId,
    };
    this.state.visits.push(visit);
    const icu = bedId.startsWith("ICU");
    this.state.opportunities.push({
      id: uuid(),
      visitId: visit.id,
      bedId,
      staffId,
      status: icu ? "VISIT_OPEN" : "HYGIENE_PENDING",
      policyVersion: this.state.policy.version,
      checkpoint: icu ? "EXPLICIT_WORKFLOW" : "NEXT_SAME_STAFF_SCAN",
      evidence: [e.id],
      identityConfidence: 1,
      zoneConfidence,
      opportunityConfidence: icu ? 0 : 0.8,
      associationConfidence: 0,
      reason: icu
        ? "Stable signal presence; no patient contact inferred."
        : "Registered badge access request; next same-staff scan is the retrospective checkpoint.",
      runId: e.runId,
    });
    this.audit(
      "VISIT_OPEN",
      visit.id,
      "VISIT_OPEN",
      "Source identity and configured device location establish a visit.",
      e,
    );
    return visit;
  }
  evaluate(visit: Visit, e: InputEvent, checkpoint: string) {
    const o = this.state.opportunities.find((x) => x.visitId === visit.id)!;
    o.checkpoint = checkpoint;
    o.opportunityConfidence = 1;
    if (
      ["EVENT_ASSOCIATED", "OVERRIDE_RECORDED", "RESOLVED"].includes(o.status)
    ) {
      this.audit(
        "CHECKPOINT",
        o.id,
        o.status,
        "Existing evidence preserved at checkpoint.",
        e,
      );
      return;
    }
    const faulty =
      !this.state.networkOnline ||
      this.state.devices.some(
        (d) => d.bedId === visit.bedId && d.status !== "ONLINE",
      );
    if (faulty || o.status === "DATA_GAP") {
      this.transition(
        o,
        "DATA_GAP",
        "Observation coverage unavailable during this visit; no adverse staff finding.",
        e,
      );
      return;
    }
    if (visit.uncertain || o.status === "NEEDS_REVIEW") {
      this.transition(
        o,
        "NEEDS_REVIEW",
        "Ambiguous zone or activation attribution requires review.",
        e,
      );
      return;
    }
    this.transition(
      o,
      "EVENT_NOT_DETECTED",
      "Configured checkpoint passed without a uniquely associated activation. This is not proof of missed hygiene.",
      e,
    );
    const recent = this.state.alerts.find(
      (a) =>
        a.opportunityId === o.id &&
        Date.parse(e.deviceTime) - Date.parse(a.createdAt) <
          this.state.policy.alertCooldownMs,
    );
    if (!recent) {
      const id = uuid();
      this.state.alerts.push({
        id,
        opportunityId: o.id,
        bedId: o.bedId,
        type: "EVENT_NOT_DETECTED",
        state: "OPEN",
        createdAt: e.deviceTime,
        severity: "warning",
      });
      this.audit(
        "ALERT_CREATED",
        id,
        "OPEN",
        "Advisory reminder; care remains unrestricted.",
        e,
      );
      this.audit(
        "REMINDER",
        id,
        "SIMULATED_VISUAL",
        "Simulated local LED/buzzer request; no physical hardware is connected.",
        e,
      );
    }
  }
  ingest(input: InputEvent): Observation {
    const e = eventSchema.parse(input);
    const duplicate = this.state.events.find(
      (x) =>
        x.id === e.id ||
        (x.deviceId === e.deviceId &&
          (x.dedupeKey || x.id) === (e.dedupeKey || e.id)),
    );
    if (duplicate) return duplicate;
    const device = this.state.devices.find((d) => d.id === e.deviceId);
    if (!device) throw new DomainError(400, "Unknown device ID.");
    if (e.bedId && e.bedId !== device.bedId)
      throw new DomainError(
        400,
        "Event bed does not match registered device location.",
      );
    e.bedId = device.bedId;
    if (
      !["STATION"].includes(device.bedId) &&
      !this.state.beds.find((b) => b.id === device.bedId)?.active
    )
      throw new DomainError(400, "Bed is inactive.");
    if (
      (e.type === "RFID_SCAN" && device.kind !== "RFID") ||
      (e.type === "BLE_OBSERVATION" && device.kind !== "BLE") ||
      (e.type === "DISPENSER_ACTIVATE" &&
        !["DISPENSER", "STATION"].includes(device.kind))
    )
      throw new DomainError(
        400,
        "Event type does not match the registered device.",
      );
    if (
      (e.type === "RFID_SCAN" || e.type === "BLE_OBSERVATION") &&
      !e.credential
    )
      throw new DomainError(400, "Credential is required.");
    if (e.type === "BLE_OBSERVATION" && e.rssi === undefined)
      throw new DomainError(400, "RSSI observation is required.");
    if (
      !this.state.networkOnline &&
      ["RFID_SCAN", "BLE_OBSERVATION", "DISPENSER_ACTIVATE"].includes(e.type)
    ) {
      if (!this.state.queuedEvents.some((q) => q.id === e.id))
        this.state.queuedEvents.push(e);
      this.audit(
        "SIMULATOR_BUFFER",
        e.id,
        "QUEUED",
        "Software simulator queue; source event will reconcile unchanged on reconnect.",
        e,
      );
      this.save();
      return {
        ...e,
        receivedTime: new Date().toISOString(),
        sequence: this.state.sequence,
        classification: "QUEUED",
      };
    }
    const before = structuredClone(this.state);
    try {
      const obs: Observation = {
        ...e,
        receivedTime: new Date().toISOString(),
        sequence: ++this.state.sequence,
        classification: "DETECTED",
      };
      this.state.events.push(obs);
      device.lastSeen = obs.receivedTime;
      this.audit(
        "SOURCE_OBSERVATION",
        e.id,
        "DETECTED",
        `${e.type}; ${e.source}; receipt and device clocks retained separately.`,
        e,
      );
      const active = (staff?: string) =>
        this.state.visits.filter(
          (v) => !v.endAt && sameScope(v, e) && (!staff || v.staffId === staff),
        );
      if (e.type === "DEVICE_FAULT" || e.type === "DEVICE_RECOVER") {
        const target = this.state.devices.find(
          (d) => d.id === `${e.bedId}-DISP`,
        )!;
        const previous = target.status;
        target.status = e.type === "DEVICE_FAULT" ? "FAULT" : "ONLINE";
        obs.classification =
          e.type === "DEVICE_FAULT" ? "DEVICE_FAULT" : "DEVICE_RECOVERED";
        this.audit(
          "DEVICE_HEALTH",
          target.id,
          target.status,
          "Simulated sensor health transition.",
          e,
          previous,
        );
        if (e.type === "DEVICE_FAULT")
          for (const o of this.state.opportunities.filter(
            (o) =>
              o.bedId === e.bedId &&
              !["EVENT_ASSOCIATED", "RESOLVED", "OVERRIDE_RECORDED"].includes(
                o.status,
              ),
          ))
            this.transition(
              o,
              "DATA_GAP",
              "Sensor coverage was interrupted during the visit.",
              e,
            );
      } else if (e.type === "NETWORK_DOWN" || e.type === "NETWORK_UP") {
        this.state.networkOnline = e.type === "NETWORK_UP";
        obs.classification = this.state.networkOnline
          ? "NETWORK_RESTORED"
          : "DATA_GAP";
        this.state.devices.forEach((d) => {
          if (d.status !== "FAULT")
            d.status = this.state.networkOnline ? "ONLINE" : "OFFLINE";
        });
        if (!this.state.networkOnline)
          for (const o of this.state.opportunities.filter(
            (o) =>
              !["EVENT_ASSOCIATED", "RESOLVED", "OVERRIDE_RECORDED"].includes(
                o.status,
              ),
          ))
            this.transition(
              o,
              "DATA_GAP",
              "Network observation gap; reconciliation cannot establish continuous coverage.",
              e,
            );
      } else if (e.type === "RFID_SCAN" || e.type === "BLE_OBSERVATION") {
        const credential = this.state.credentials.find(
          (c) =>
            c.id === e.credential &&
            !c.revoked &&
            c.kind === (e.type === "RFID_SCAN" ? "RFID" : "BLE"),
        );
        if (!credential) {
          obs.classification = "IDENTITY_UNVERIFIED";
          this.audit(
            "IDENTITY",
            e.id,
            "IDENTITY_UNVERIFIED",
            "Unknown or revoked credential; no staff identity inferred.",
            e,
          );
        } else if (device.status !== "ONLINE") {
          obs.classification = "DATA_GAP";
        } else if (e.type === "RFID_SCAN") {
          for (const v of active(credential.staffId).filter((v) =>
            v.bedId.startsWith("GW"),
          )) {
            if (v.bedId === e.bedId) {
              obs.classification = "REPEATED_SCAN";
              return this.finish(obs);
            }
            this.evaluate(v, e, "NEXT_SAME_STAFF_SCAN");
            v.endAt = e.deviceTime;
            this.audit(
              "VISIT_CLOSED",
              v.id,
              "CLOSED",
              "Same staff next bed checkpoint evaluated before opening next visit.",
              e,
            );
          }
          this.openVisit(credential.staffId, e.bedId, e, 1);
          obs.classification = "HYGIENE_PENDING";
          this.move(credential.staffId, e.bedId, "tap", e);
        } else {
          const samples = this.state.events.filter(
            (x) =>
              x.type === "BLE_OBSERVATION" &&
              x.credential === e.credential &&
              sameScope(x, e) &&
              Date.parse(e.deviceTime) - Date.parse(x.deviceTime) >= 0 &&
              Date.parse(e.deviceTime) - Date.parse(x.deviceTime) <=
                this.state.policy.bleWindowMs &&
              this.state.devices.find((d) => d.id === x.deviceId)?.status ===
                "ONLINE",
          );
          const groups = new Map<string, number[]>();
          for (const s of samples) {
            const list = groups.get(s.bedId!) || [];
            list.push(s.rssi!);
            groups.set(s.bedId!, list);
          }
          const ranked = [...groups]
            .map(([bedId, values]) => ({
              bedId,
              count: values.length,
              mean: values.reduce((s, v) => s + v, 0) / values.length,
            }))
            .sort((a, b) => b.mean - a.mean);
          const best = ranked[0];
          const ambiguous =
            ranked.length > 1 &&
            best.mean - ranked[1].mean < this.state.policy.bleMargin;
          if (ambiguous) {
            obs.classification = "NEEDS_REVIEW";
            for (const v of active(credential.staffId).filter((v) =>
              v.bedId.startsWith("ICU"),
            )) {
              v.uncertain = true;
              this.transition(
                this.state.opportunities.find((o) => o.visitId === v.id)!,
                "NEEDS_REVIEW",
                "Adjacent BLE means fall within the configured uncertainty margin.",
                e,
              );
            }
          } else if (
            best.count >= this.state.policy.bleMinSamples &&
            best.mean > -75
          ) {
            // Transitions preserve unresolved previous opportunities; packet loss never closes a visit.
            const previous = active(credential.staffId).filter((v) =>
              v.bedId.startsWith("ICU"),
            );
            for (const v of previous.filter((v) => v.bedId !== best.bedId)) {
              v.endAt = e.deviceTime;
              const o = this.state.opportunities.find(
                (o) => o.visitId === v.id,
              )!;
              if (
                !["EVENT_ASSOCIATED", "OVERRIDE_RECORDED", "RESOLVED"].includes(
                  o.status,
                )
              )
                this.transition(
                  o,
                  "NEEDS_REVIEW",
                  "Zone changed without an explicit clinical exit checkpoint.",
                  e,
                );
            }
            if (!previous.some((v) => v.bedId === best.bedId))
              this.openVisit(credential.staffId, best.bedId, e, 0.78);
            obs.classification = "VISIT_OPEN";
            this.move(credential.staffId, best.bedId, "walk", e);
          } else obs.classification = "INCIDENTAL_PROXIMITY";
        }
      } else if (e.type === "DISPENSER_ACTIVATE") {
        const candidates = active().filter(
          (v) =>
            v.bedId === e.bedId &&
            Date.parse(e.deviceTime) >= Date.parse(v.startAt) &&
            Date.parse(e.deviceTime) - Date.parse(v.startAt) <=
              this.state.policy.matchingWindowMs,
        );
        const candidateOps = candidates.map((v) =>
          this.state.opportunities.find((o) => o.visitId === v.id)!,
        );
        const valid =
          candidates.length === 1 &&
          !candidates[0].uncertain &&
          device.status === "ONLINE" &&
          this.state.networkOnline &&
          candidateOps[0]?.status !== "DATA_GAP";
        const status = valid
          ? "EVENT_ASSOCIATED"
          : candidates.length
            ? "NEEDS_REVIEW"
            : "UNMATCHED";
        this.state.activations.push({
          id: uuid(),
          eventId: e.id,
          bedId: e.bedId,
          time: e.deviceTime,
          status,
          opportunityId: valid ? candidateOps[0].id : null,
          candidates: candidateOps.map((o) => o.id),
        });
        obs.classification = "ACTIVATION_RECORDED";
        if (valid) {
          const o = candidateOps[0];
          o.associationConfidence = 0.85;
          this.transition(
            o,
            "EVENT_ASSOCIATED",
            "One supported active visit within the matching window. Activation does not prove hygiene quality.",
            e,
          );
          this.move(o.staffId, e.bedId, "press", e);
        } else
          for (const o of candidateOps)
            if (o.status !== "DATA_GAP")
              this.transition(
                o,
                "NEEDS_REVIEW",
                "Multiple plausible staff or uncertain zone/health; activation remains unassigned.",
                e,
              );
      } else if (["START_CARE", "END_CARE", "CHECKPOINT"].includes(e.type)) {
        if (!e.staffId)
          throw new DomainError(
            400,
            "Explicit workflow checkpoint requires staff identity.",
          );
        const v = active(e.staffId).find((v) => v.bedId === e.bedId);
        if (v) {
          this.evaluate(v, e, e.type);
          obs.classification = this.state.opportunities.find(
            (o) => o.visitId === v.id,
          )!.status;
          if (e.type === "END_CARE") v.endAt = e.deviceTime;
          this.move(e.staffId, e.bedId, "care", e);
        } else obs.classification = "NEEDS_REVIEW";
      } else if (e.type === "AUTHORIZE_OVERRIDE") {
        if (
          !e.actorRole ||
          !["SUPERVISOR", "ADMIN"].includes(e.actorRole) ||
          !e.reason ||
          e.reason.trim().length < 5
        )
          throw new DomainError(
            403,
            "Authorized reviewer and reason required for emergency override.",
          );
        const o = this.state.opportunities.find(
          (o) =>
            sameScope(o, e) && o.bedId === e.bedId && o.staffId === e.staffId,
        );
        if (!o)
          throw new DomainError(400, "No linked opportunity for exception.");
        const old = o.status;
        o.status = "OVERRIDE_RECORDED";
        o.reason = e.reason;
        o.evidence.push(e.id);
        obs.classification = "OVERRIDE_RECORDED";
        this.audit(
          "OVERRIDE_RECORDED",
          o.id,
          o.status,
          e.reason,
          e,
          old,
          `demo-${e.actorRole}`,
        );
        for (const alert of this.state.alerts.filter(
          (a) => a.opportunityId === o.id,
        )) {
          const oldState = alert.state;
          alert.state = "CLOSED_WITH_EXCEPTION";
          alert.reason = e.reason;
          alert.actor = `demo-${e.actorRole}`;
          alert.resolvedAt = new Date().toISOString();
          this.audit(
            "ALERT_OVERRIDE",
            alert.id,
            alert.state,
            e.reason,
            e,
            oldState,
            alert.actor,
          );
        }
      } else if (
        e.type === "GUIDANCE_STEP" ||
        e.type === "CAMERA_UNAVAILABLE"
      ) {
        if (e.bedId !== "STATION")
          throw new DomainError(
            400,
            "Guidance events belong only to the shared station.",
          );
        let session = this.state.techniques.find(
          (t) => t.runId === e.runId && t.result === "IN_PROGRESS",
        );
        if (!session) {
          session = {
            id: uuid(),
            runId: e.runId,
            startedAt: e.deviceTime,
            endedAt: null,
            protocolVersion: this.state.policy.protocolVersion,
            steps: [],
            result: "IN_PROGRESS",
          };
          this.state.techniques.push(session);
        }
        if (e.type === "GUIDANCE_STEP") {
          if (e.step !== session.steps.length + 1)
            throw new DomainError(400, "Guidance steps must be in order.");
          session.steps.push({
            index: e.step,
            result: "UNKNOWN",
            confidence: 0,
            at: e.deviceTime,
          });
        }
        if (e.type === "CAMERA_UNAVAILABLE" || session.steps.length === 8) {
          session.result = "UNABLE_TO_ASSESS";
          session.endedAt = e.deviceTime;
        }
        obs.classification = session.result;
        this.audit(
          "TECHNIQUE_SIMULATION",
          session.id,
          session.result,
          "Guided-only simulation; no camera evidence or clinical assessment fabricated.",
          e,
        );
      } else if (e.type === "PERMISSION_CHECK") {
        obs.classification = "PERMISSION_DENIED";
        this.audit(
          "PERMISSION_DENIED",
          "demo-CLINICIAN",
          "DENIED",
          "Scripted clinician export attempt rejected; no report exported.",
          e,
          null,
          "demo-CLINICIAN",
        );
      } else if (e.type === "MOVE_ACTOR") {
        if (e.staffId) this.move(e.staffId, e.bedId, e.action || "walk", e);
        obs.classification = "MOVEMENT_ONLY";
      }
      if (
        Math.abs(Date.parse(e.deviceTime) - Date.parse(obs.receivedTime)) >
        300000
      )
        this.audit(
          "CLOCK_DRIFT",
          e.id,
          "REVIEW_CLOCK",
          "Device and receipt timestamps differ by more than five minutes.",
          e,
        );
      this.finish(obs);
      if (e.type === "NETWORK_UP") {
        const queued = [...this.state.queuedEvents];
        this.state.queuedEvents = [];
        for (const q of queued) this.ingest(q);
        this.save();
      }
      return obs;
    } catch (error) {
      this.state = before;
      throw error;
    }
  }
  finish(obs: Observation) {
    this.save();
    return obs;
  }
  move(
    id: string,
    bedId: string,
    action: Snapshot["actors"][number]["action"],
    e: InputEvent,
  ) {
    const actor = this.state.actors.find((a) => a.id === id);
    if (actor) Object.assign(actor, { bedId, action, changedAt: e.deviceTime });
    else this.state.actors.push({ id, bedId, action, changedAt: e.deviceTime });
  }
  alertAction(
    id: string,
    action: "acknowledge" | "review" | "escalate" | "resolve" | "override",
    reason: string,
    role: Role,
  ) {
    this.authorize(
      role,
      action === "acknowledge"
        ? ["CLINICIAN", "SUPERVISOR", "ADMIN"]
        : ["SUPERVISOR", "ADMIN"],
      `alert ${action}`,
    );
    const alert = this.state.alerts.find((a) => a.id === id);
    if (!alert) throw new DomainError(404, "Alert not found.");
    if (reason.trim().length < 5)
      throw new DomainError(
        400,
        "A meaningful reason or evidence note is required.",
      );
    if (["RESOLVED", "CLOSED_WITH_EXCEPTION"].includes(alert.state))
      throw new DomainError(409, "This review is already closed.");
    const old = alert.state;
    alert.actor = `demo-${role}`;
    alert.reason = reason;
    const now = new Date().toISOString();
    if (action === "acknowledge") {
      alert.state = "ACKNOWLEDGED";
      alert.acknowledgedAt = now;
    }
    if (action === "review" || action === "escalate") {
      alert.state = "UNDER_REVIEW";
      if (action === "escalate") alert.severity = "critical";
    }
    if (action === "resolve" || action === "override") {
      alert.state = action === "resolve" ? "RESOLVED" : "CLOSED_WITH_EXCEPTION";
      alert.resolvedAt = now;
      const o = this.state.opportunities.find(
        (o) => o.id === alert.opportunityId,
      )!;
      const prev = o.status;
      o.status = action === "resolve" ? "RESOLVED" : "OVERRIDE_RECORDED";
      o.reason = reason;
      this.audit(
        action === "override" ? "OVERRIDE_RECORDED" : "REVIEW_RESOLUTION",
        o.id,
        o.status,
        reason,
        undefined,
        prev,
        alert.actor,
      );
    }
    this.audit(
      action === "acknowledge"
        ? "ALERT_ACKNOWLEDGED"
        : `ALERT_${action.toUpperCase()}`,
      id,
      alert.state,
      reason,
      undefined,
      old,
      alert.actor,
    );
    this.save();
    return alert;
  }
  startRun(scenarioId: string, actorRole: Role = "SUPERVISOR") {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) throw new DomainError(404, "Unknown scenario.");
    if (scenarioId === "SYS-03")
      this.authorize(
        actorRole,
        ["SUPERVISOR", "ADMIN"],
        "run emergency exception scenario",
      );
    for (const run of this.state.runs)
      if (run.status === "RUNNING") run.status = "PAUSED";
    const run: Run = {
      id: uuid(),
      scenarioId,
      startedAt: new Date().toISOString(),
      status: "RUNNING",
      cursor: 0,
      elapsedMs: 0,
      speed: 1,
      lastTick: Date.now(),
      actorRole,
    };
    this.state.runs.push(run);
    this.audit("SCENARIO_STARTED", run.id, "RUNNING", scenario.title);
    this.save();
    return run;
  }
  runAction(
    id: string,
    action: "pause" | "resume" | "step" | "speed",
    speed = 1,
  ) {
    const r = this.state.runs.find((r) => r.id === id);
    if (!r) throw new DomainError(404, "Run not found.");
    if (action === "speed") r.speed = speed;
    if (action === "pause") r.status = "PAUSED";
    if (action === "resume" && r.status !== "COMPLETED") {
      r.status = "RUNNING";
      r.lastTick = Date.now();
    }
    if (action === "step" && r.status !== "COMPLETED") {
      r.status = "PAUSED";
      this.executeStep(r);
    }
    this.save();
    return r;
  }
  executeStep(run: Run) {
    const scenario = scenarios.find((s) => s.id === run.scenarioId)!;
    const a = scenario.actions[run.cursor];
    if (!a) return;
    const event: InputEvent = {
      ...a,
      id: `${run.id}-${run.cursor}`,
      deviceId: deviceFor(a.type, a.bedId),
      deviceTime: new Date(Date.parse(run.startedAt) + a.tMs).toISOString(),
      source: "SIMULATED",
      runId: run.id,
      actorRole: run.actorRole || "SUPERVISOR",
    };
    this.ingest(event);
    run.cursor++;
    run.elapsedMs = Math.max(run.elapsedMs, a.tMs);
    if (run.cursor >= scenario.actions.length) {
      run.status = "COMPLETED";
      this.audit(
        "SCENARIO_COMPLETED",
        run.id,
        "COMPLETED",
        "All source actions ingested. Compare predictions in Validation Lab.",
      );
    }
    this.save();
  }
  tick() {
    for (const r of this.state.runs.filter((r) => r.status === "RUNNING")) {
      const now = Date.now();
      r.elapsedMs += (now - r.lastTick) * r.speed;
      r.lastTick = now;
      const s = scenarios.find((s) => s.id === r.scenarioId)!;
      if (s.actions[r.cursor]?.tMs <= r.elapsedMs) this.executeStep(r);
    }
  }
  prediction(runId: string) {
    const os = this.state.opportunities.filter((o) => o.runId === runId);
    for (const status of [
      "DATA_GAP",
      "NEEDS_REVIEW",
      "EVENT_NOT_DETECTED",
      "EVENT_ASSOCIATED",
      "HYGIENE_PENDING",
      "VISIT_OPEN",
    ])
      if (os.some((o) => o.status === status)) return status;
    return (
      this.state.events.filter((e) => e.runId === runId).at(-1)
        ?.classification || "NO_OBSERVATIONS"
    );
  }
}
