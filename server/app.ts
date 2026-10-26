import Fastify from "fastify";
import websocket from "@fastify/websocket";
import staticPlugin from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import { Engine, DomainError } from "./engine";
import { roles, eventSchema, type Role, type Bed } from "../shared/types";
import { scenarios } from "../shared/scenarios";

export async function createApp(engine = new Engine()) {
  const app = Fastify({ logger: false });
  const sessions = new Map<string, Role>();
  const clients = new Set<{ send: (s: string) => void; readyState: number }>();
  await app.register(websocket);
  const getRole = (cookie: string | undefined) =>
    sessions.get(
      cookie
        ?.split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("hygiene_session="))
        ?.split("=")[1] || "",
    );
  app.addHook("preHandler", async (request) => {
    if (
      request.url.startsWith("/api/") &&
      !["/api/auth/login", "/api/health"].includes(request.url.split("?")[0])
    ) {
      if (!getRole(request.headers.cookie))
        throw new DomainError(401, "Choose a local demo role to continue.");
    }
    if (
      !["GET", "HEAD"].includes(request.method) &&
      request.headers.origin &&
      !/^http:\/\/(localhost|127\.0\.0\.1):(5173|5174|3001|3002)$/.test(
        request.headers.origin,
      )
    )
      throw new DomainError(403, "Unexpected request origin.");
  });
  app.setErrorHandler((error, _request, reply) => {
    const status =
      error instanceof ZodError
        ? 400
        : error instanceof DomainError
          ? error.statusCode
          : 500;
    reply.code(status).send({
      error:
        status === 500
          ? "The operation could not be completed."
          : error instanceof Error
            ? error.message
            : "Invalid request",
    });
    if (status === 500) console.error(error);
  });
  app.get("/api/health", async () => ({ ok: true, mode: "LOCAL_SIMULATION" }));
  app.post("/api/auth/login", async (req, reply) => {
    const { role } = z.object({ role: z.enum(roles) }).parse(req.body);
    const token = randomUUID();
    sessions.set(token, role);
    reply.header(
      "Set-Cookie",
      `hygiene_session=${token}; HttpOnly; SameSite=Strict; Path=/`,
    );
    engine.audit(
      "DEMO_LOGIN",
      `demo-${role}`,
      role,
      "Local demo role session; not production identity authentication.",
      undefined,
      null,
      `demo-${role}`,
    );
    engine.save();
    return { role };
  });
  app.get("/api/session", async (req) => ({
    role: getRole(req.headers.cookie),
  }));
  app.get("/api/state", async () => engine.state);
  app.get("/api/scenarios", async () => scenarios);
  app.get("/api/live", { websocket: true }, (socket) => {
    clients.add(socket);
    socket.send(
      JSON.stringify({
        sequence: engine.state.sequence,
        snapshot: engine.state,
      }),
    );
    socket.on("close", () => clients.delete(socket));
  });
  engine.onChange = () => {
    const message = JSON.stringify({
      sequence: engine.state.sequence,
      snapshot: engine.state,
    });
    for (const client of clients)
      if (client.readyState === 1) client.send(message);
  };
  app.post("/api/events", async (req) => {
    engine.authorize(
      getRole(req.headers.cookie)!,
      ["CLINICIAN", "SUPERVISOR", "BIOMEDICAL", "ADMIN"],
      "simulate observation",
    );
    const body = eventSchema.parse(req.body);
    body.actorRole = getRole(req.headers.cookie)!;
    if (body.source !== "SIMULATED")
      throw new DomainError(
        403,
        "This local endpoint accepts SIMULATED observations only; hardware provisioning is not enabled.",
      );
    return engine.ingest(body);
  });
  app.post("/api/scenarios/:id/run", async (req) => {
    engine.authorize(
      getRole(req.headers.cookie)!,
      ["CLINICIAN", "SUPERVISOR", "BIOMEDICAL", "ADMIN"],
      "run scenario",
    );
    return engine.startRun(
      (req.params as { id: string }).id,
      getRole(req.headers.cookie)!,
    );
  });
  app.post("/api/runs/:id/:action", async (req) => {
    engine.authorize(
      getRole(req.headers.cookie)!,
      ["CLINICIAN", "SUPERVISOR", "BIOMEDICAL", "ADMIN"],
      "control scenario",
    );
    const { id, action } = z
      .object({
        id: z.string(),
        action: z.enum(["pause", "resume", "step", "speed"]),
      })
      .parse(req.params);
    const body = z
      .object({
        speed: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
      })
      .parse(req.body || {});
    return engine.runAction(id, action, body.speed);
  });
  app.post("/api/alerts/:id/:action", async (req) => {
    const { id, action } = z
      .object({
        id: z.string(),
        action: z.enum([
          "acknowledge",
          "review",
          "escalate",
          "resolve",
          "override",
        ]),
      })
      .parse(req.params);
    const { reason } = z
      .object({ reason: z.string().min(5).max(1000) })
      .parse(req.body);
    return engine.alertAction(id, action, reason, getRole(req.headers.cookie)!);
  });
  app.post("/api/beds", async (req) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(role, ["ADMIN"], "configure bed");
    const body = z
      .object({
        ward: z.enum(["GENERAL", "ICU"]),
        name: z.string().min(2).max(48),
      })
      .parse(req.body);
    const index = engine.state.beds.filter((b) => b.ward === body.ward).length;
    const id = `${body.ward === "GENERAL" ? "GW" : "ICU"}-B${String(index + 1).padStart(2, "0")}`;
    const bed: Bed = {
      id,
      ...body,
      active: true,
      position:
        body.ward === "GENERAL"
          ? [-7.5 + (index % 2) * 4, 0, -4 + Math.floor(index / 2) * 5]
          : [4.1 + (index % 3) * 3.8, 0, -2.8 + Math.floor(index / 3) * 5],
    };
    engine.state.beds.push(bed);
    for (const kind of [
      body.ward === "GENERAL" ? "RFID" : "BLE",
      "DISP",
      "FLOW",
    ] as const)
      engine.state.devices.push({
        id: `${id}-${kind}`,
        kind:
          kind === "DISP" ? "DISPENSER" : kind === "FLOW" ? "WORKFLOW" : kind,
        bedId: id,
        status: "ONLINE",
        lastSeen: null,
        firmware: "sim-2.0",
        source: "SIMULATED",
      });
    engine.audit(
      "CONFIG_BED",
      id,
      "ACTIVE",
      "New bed with registered simulation devices.",
      undefined,
      null,
      `demo-${role}`,
    );
    engine.save();
    return bed;
  });
  app.patch("/api/beds/:id", async (req) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(role, ["ADMIN"], "configure bed");
    const body = z
      .object({
        name: z.string().min(2).max(48).optional(),
        active: z.boolean().optional(),
      })
      .parse(req.body);
    const bed = engine.state.beds.find(
      (b) => b.id === (req.params as { id: string }).id,
    );
    if (!bed) throw new DomainError(404, "Bed not found.");
    if (
      body.active === false &&
      engine.state.beds.filter((b) => b.ward === bed.ward && b.active).length <=
        (bed.ward === "GENERAL" ? 2 : 3)
    )
      throw new DomainError(
        400,
        "Keep at least two General beds and three ICU zones active.",
      );
    if (
      body.active === false &&
      engine.state.visits.some((v) => v.bedId === bed.id && !v.endAt)
    )
      throw new DomainError(
        409,
        "Active visits must be reviewed before deactivating a bed.",
      );
    Object.assign(bed, body);
    engine.audit(
      "CONFIG_BED",
      bed.id,
      JSON.stringify(body),
      "Bed configuration updated.",
      undefined,
      null,
      `demo-${role}`,
    );
    engine.save();
    return bed;
  });
  app.post("/api/credentials/:id/revoke", async (req) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(role, ["ADMIN"], "revoke credential");
    const c = engine.state.credentials.find(
      (c) => c.id === (req.params as { id: string }).id,
    );
    if (!c) throw new DomainError(404, "Credential not found.");
    c.revoked = true;
    engine.audit(
      "CREDENTIAL_REVOKED",
      c.id,
      "REVOKED",
      "Credential disabled by administrator.",
      undefined,
      "ACTIVE",
      `demo-${role}`,
    );
    engine.save();
    return c;
  });
  app.post("/api/credentials", async (req) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(role, ["ADMIN"], "enroll credential");
    const c = z
      .object({
        id: z.string().min(3).max(80),
        staffId: z.string(),
        kind: z.enum(["RFID", "BLE"]),
      })
      .parse(req.body);
    if (
      !engine.state.staff.some(
        (s) => s.id === c.staffId && s.role !== "Visitor",
      )
    )
      throw new DomainError(400, "Select registered staff.");
    if (engine.state.credentials.some((x) => x.id === c.id))
      throw new DomainError(409, "Credential already exists.");
    engine.state.credentials.push({ ...c, revoked: false });
    engine.audit(
      "CREDENTIAL_ENROLLED",
      c.id,
      "ACTIVE",
      "New credential mapped to registered staff.",
      undefined,
      null,
      `demo-${role}`,
    );
    engine.save();
    return c;
  });
  app.patch("/api/policy", async (req) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(role, ["ADMIN"], "change policy");
    const body = z
      .object({
        matchingWindowMs: z.number().int().min(5000).max(600000).optional(),
        bleMargin: z.number().min(3).max(20).optional(),
        retentionDays: z.number().int().min(1).max(365).optional(),
        steps: z.array(z.string().min(2).max(160)).length(8).optional(),
      })
      .parse(req.body);
    const old = engine.state.policy.version;
    Object.assign(engine.state.policy, body, {
      version: `research-${Date.now()}`,
    });
    if (body.steps) engine.state.policy.protocolVersion = `demo-${Date.now()}`;
    engine.audit(
      "POLICY_UPDATED",
      "active",
      engine.state.policy.version,
      JSON.stringify(body),
      undefined,
      old,
      `demo-${role}`,
    );
    engine.save();
    return engine.state.policy;
  });
  app.post("/api/technique", async (req) => {
    engine.authorize(
      getRole(req.headers.cookie)!,
      ["CLINICIAN", "SUPERVISOR", "ADMIN"],
      "start guidance",
    );
    const t = {
      id: randomUUID(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      protocolVersion: engine.state.policy.protocolVersion,
      steps: [],
      result: "IN_PROGRESS" as const,
    };
    engine.state.techniques.push(t);
    engine.audit(
      "TECHNIQUE_STARTED",
      t.id,
      t.result,
      "Anonymous session; locally processed camera only.",
    );
    engine.save();
    return t;
  });
  app.post("/api/technique/:id/step", async (req) => {
    engine.authorize(
      getRole(req.headers.cookie)!,
      ["CLINICIAN", "SUPERVISOR", "ADMIN"],
      "record guidance",
    );
    const t = engine.state.techniques.find(
      (t) => t.id === (req.params as { id: string }).id,
    );
    if (!t) throw new DomainError(404, "Session not found.");
    const body = z
      .object({
        index: z.number().int().min(1).max(8),
        result: z.enum(["OBSERVED", "UNKNOWN"]),
        confidence: z.number().min(0).max(1),
      })
      .parse(req.body);
    if (t.result !== "IN_PROGRESS" || body.index !== t.steps.length + 1)
      throw new DomainError(409, "Record steps in order, exactly once.");
    t.steps.push({ ...body, at: new Date().toISOString() });
    if (t.steps.length === 8) {
      t.endedAt = new Date().toISOString();
      t.result = t.steps.some((s) => s.result === "UNKNOWN")
        ? "UNABLE_TO_ASSESS"
        : "RETRY_RECOMMENDED";
    }
    engine.audit(
      "TECHNIQUE_STEP",
      t.id,
      t.result,
      `Step ${body.index}: ${body.result}. Observed landmarks are not validated technique assessment.`,
    );
    engine.save();
    return t;
  });
  app.post("/api/validation", async (req) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(
      role,
      ["ADMIN", "SUPERVISOR", "INFECTION_PREVENTION"],
      "record validation",
    );
    const body = z
      .object({
        runId: z.string(),
        expected: z.string().min(3),
        method: z.enum(["SCRIPTED", "MANUAL"]),
      })
      .parse(req.body);
    const run = engine.state.runs.find((r) => r.id === body.runId);
    if (!run || run.status !== "COMPLETED")
      throw new DomainError(400, "Select a completed run.");
    const predicted = engine.prediction(body.runId);
    const v = {
      id: randomUUID(),
      ...body,
      predicted,
      matches: predicted === body.expected,
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
    return v;
  });
  app.get("/api/export", async (req, reply) => {
    const role = getRole(req.headers.cookie)!;
    engine.authorize(
      role,
      ["ADMIN", "AUDITOR", "INFECTION_PREVENTION"],
      "export report",
    );
    const { ward } = z
      .object({ ward: z.enum(["ALL", "GENERAL", "ICU"]).default("ALL") })
      .parse(req.query);
    engine.audit(
      "REPORT_EXPORT",
      "events",
      "EXPORTED",
      `CSV source evidence; ward=${ward}`,
      undefined,
      null,
      `demo-${role}`,
    );
    engine.save();
    const rows = engine.state.events.filter(
      (e) =>
        ward === "ALL" ||
        engine.state.beds.find((b) => b.id === e.bedId)?.ward === ward,
    );
    const safe = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    return reply
      .header(
        "Content-Disposition",
        'attachment; filename="hygiene-evidence.csv"',
      )
      .type("text/csv")
      .send(
        [
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
        ].join("\r\n"),
      );
  });
  if (existsSync(resolve("dist")))
    await app.register(staticPlugin, { root: resolve("dist"), prefix: "/" });
  app.addHook("onClose", async () => {
    engine.store.close();
  });
  return { app, engine };
}
