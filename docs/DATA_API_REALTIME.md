# Persistent data, API and real-time synchronization

## Architecture

React/Vite + TypeScript + R3F/Drei + Tailwind accessible primitives + ECharts front end; Fastify+Zod TypeScript API; SQL database with migrations (SQLite zero-credential local; a later PostgreSQL adapter), typed WebSocket feed. Simulation engine runs server-side independently of renderer; hardware ingest uses same validated event pipeline. Prefer tested pure functions for matching and time-window logic. No mandatory cloud services.

## Database entities / minimum keys

- `Hospital(hospitalId, name, timezone, status)`.
- `Ward(wardId, hospitalId, type GENERAL|ICU, displayName)`.
- `Bed(bedId, wardId, displayName, optionalPseudonymizedPatientRef, active)`.
- `Staff(staffId, pseudonym, role, active)`.
- `StaffCredential(credentialId, staffId, type RFID|BLE, protectedUidRef, revokedAt)`.
- `Device(deviceId, deviceType, firmware, status, lastHeartbeat, sourceMode)`.
- `DeviceLocation(mappingId, deviceId, wardId, bedId/zoneId/stationId, effectiveFrom, effectiveTo)`.
- `DeviceEvent(eventId, deviceId, eventType, deviceTimestamp, receivedTimestamp, sourceMode, payloadJson, schemaVersion, dedupeKey)`.
- `Visit(visitId, staffId nullable, bedId, entrySourceEventId, startAt, endAt, state, zoneConfidence)`.
- `HygieneOpportunity(opportunityId, visitId, policyVersion, checkpointType, dueAt, status, confidence, evidenceRef)`.
- `DispenserEvent(dispenserEventId, sourceDeviceEventId, dispenserId, activationAt, matchStatus, matchedOpportunityId nullable, matchConfidence)`.
- `Alert(alertId, opportunityId nullable, type, severity, state, triggeredAt, acknowledgedBy/At, resolvedBy/At, reason)`.
- `Reminder(reminderId, alertId, deviceId, emittedAt, effectStatus, repeatNumber)`.
- `Override(overrideId, relatedEventId, actorId, actorRole, reason, createdAt)`.
- `TechniqueSession(sessionId, stationId, staffId nullable, startedAt, endedAt, protocolVersion, result, confidence)`.
- `TechniqueStepResult(stepResultId, sessionId, stepIndex 1..8, estimatedResult, confidence, assessedAt)`.
- `AuditLog(auditId, actorId/deviceId, entityType/id, eventType, occurredAt, recordedAt, oldState, newState, reason, correlationId, linkedEventId)`.
- `PolicyConfig(policyId, wardId, ruleVersion, checkpointConfig, matchingWindowMs, alertCooldownMs, validFrom)`.
- `ScenarioRun(runId, scenarioId, seed, startedAt, endedAt, sourceMode, status)`.
- `GroundTruthLabel(labelId, runId, scenarioStepId, approvedObserver, trueClass)`.
- `ValidationRun(validationId, runId, engineVersion, metricsJson, measuredAt)`.
- `UserAccount/Role(userId, role, permissions, status)`.

Design appropriate composite indexes for event type/time/ward/bed, uniqueness on `eventId` or `(deviceId,dedupeKey)`, and foreign keys preserving histories. All mutable state transitions produce **new AuditLog rows**; raw events cannot be edited in place through API. Use an event/outbox transaction or equivalent so persistent state and notifications remain consistent.

## REST API contracts (suggested routes)

- `POST /api/auth/login`, `GET /api/session`, `POST /api/auth/logout`
- `GET/POST/PATCH /api/hospitals`, `/api/wards`, `/api/beds`
- `GET/POST/PATCH /api/staff`, `/api/credentials`, `POST /api/credentials/:id/revoke`
- `GET/POST/PATCH /api/devices`, `POST /api/devices/:id/fault`, `POST /api/devices/:id/recover`
- `POST /api/ingest/rfid`, `/api/ingest/ble`, `/api/ingest/dispenser`, `/api/ingest/proximity`, `/api/ingest/heartbeat`
- `GET /api/visits`, `GET /api/visits/:id`, `GET /api/opportunities/:id/explain`
- `GET /api/alerts`, `POST /api/alerts/:id/acknowledge`, `/review`, `/escalate`, `/resolve`
- `POST /api/overrides` (actor and nonempty reason required)
- `GET /api/analytics/summary`, `/timeseries`, `/shift`, `/heatmap`, `/devices`, `/guidance`
- `POST /api/scenarios/:id/run`, `POST /api/scenario-runs/:id/pause|resume|step|reset`, `GET /api/scenario-runs/:id/events`
- `POST /api/technique/sessions`, `POST /api/technique/sessions/:id/steps`, `POST /api/technique/sessions/:id/close`
- `POST /api/validation-runs`, `GET /api/validation-runs/:id`, `GET /api/reports/export`
- `GET /api/hardware/kits`, `/api/hardware/kits/:kitId/parts` for shared inspector metadata

Define actual paths and Zod/JSON Schema bodies centrally; all auth-sensitive mutations validated at backend. Device ingest HARDWARE mode requires authenticated approved device IDs, rejects unknown devices and preserves firmware+observed timestamps. Simulation mode uses a separate server-authorized route; can't claim physical hardware connection.

## Real time

WebSocket payload: `{messageId, sequence, eventType, recordedAt, sourceMode, wardId, entityId, change}`. On connect send a snapshot or cursor; on resume request events after last sequence; client deduplicates. Keep status `CONNECTED`, `RECONNECTING`, `OFFLINE`, and indicator of stale last update. Server applies backpressure to chatty BLE packet streams; UI renders aggregations without creating thousands of text labels. Replay queued offline sensor events idempotently; recorded event time separate from receipt and reconciliation time.

## Analytics math

- `activation_association_rate = unique eligible opportunities with reliably matched activation / eligible estimated opportunities` only when denominator and data quality conditions are displayed; show undefined if denominator 0.
- `alert_ack_time = acknowledgedAt - createdAt`, `resolution_time = resolvedAt - createdAt` on valid records only.
- `device_availability = observed online duration / observed monitoring window` with coverage caveat.
- `false_alert_rate`, `missed_event_rate`, precision/recall etc ONLY from validation records with separately entered ground-truth labels.
- Show ambiguous/unassociated and data-gap counts separately. Don't inflate estimates by dropping difficult cases unnoticed.

## Provenance and seed data

Deterministic demo seed must create believable staff/bed/device mappings and synthetic event histories, all tagged `SIMULATED`. Real-time scenario events receive actual server receipt timestamps. Add a full reset with confirmation preserving ability to run a fresh dataset. Store a rule version on every opportunity to permit audit of threshold changes.
