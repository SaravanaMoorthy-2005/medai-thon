# Ward workflow engine, opportunity rules and deterministic scenarios

## Cross-cutting domain contracts

Raw events are facts about sensor/software messages. Interpreted opportunity status is an inference. Store and display them separately. Use exact PRD state vocabulary where applicable: `DETECTED`, `VISIT_OPEN`, `HYGIENE_PENDING`, `ACTIVATION_RECORDED`, `EVENT_ASSOCIATED`, `EVENT_NOT_DETECTED`, `NEEDS_REVIEW`, `ALERT_ACKNOWLEDGED`, `RESOLVED`, `OVERRIDE_RECORDED`, `DEVICE_FAULT`, `DATA_GAP`. Add type-safe substatuses for simulated clinical checkpoint and zone estimate; don't rename PRD states in stored audit.

Four independent confidence dimensions: identity (from credential resolution), bed-zone estimate (BLE/extra proximity), opportunity estimate (checkpoint evidence), dispenser association (unique matching to active visit). Store a rule trace with evidence refs, policy version, thresholds, ambiguous candidates and uncertainty reasons. Confidence scores are engineered heuristics to validate, NOT clinical probabilities.

## General Ward RFID state machine

`RFID_SCAN(readerId, badgeUID, eventId, deviceTime)` -> authenticate registered reader/badge mapping -> `DETECTED` -> if previous open visit for SAME staff at another bed, evaluate its outstanding checkpoint before establishing current new visit -> `VISIT_OPEN` new visit -> policy-based `HYGIENE_PENDING` opportunity. A dispenser activation becomes `ACTIVATION_RECORDED`, and becomes `EVENT_ASSOCIATED` only if a single valid candidate visit/opportunity is found by device mapping + rule windows + evidence. Same-staff next-bed scan checks previous required event; no association => `EVENT_NOT_DETECTED`, alert, audible/visual prompt, audit, **new visit still created**. Late evidence may support documented `RESOLVED` but prior alert/audit remains. Unknown/revoked badge must not resolve identity; no physical access blocking. RFID alone does not detect skipped scans.

Policy-required before-contact opportunity can be triggered earlier by explicit simulated `START_CARE` with supporting zone sensor/workflow evidence; do not rely only on retrospective scan.

## ICU BLE state machine

Each of three configured zone nodes emits observations for tag IDs and signal quality. Filter jitter with sample smoothing, persistence and hysteresis. A tag observed by adjacent similar-strength nodes => `ZONE_UNCERTAIN` / `NEEDS_REVIEW`; transient packet loss shouldn't trigger exit. Opening a visit from probable zone presence does NOT mean patient contact. A separate configured bed-space/workflow event establishes an actual **estimated opportunity**. At a configured pre-contact or exit checkpoint evaluate reliable matching dispenser event, otherwise `EVENT_NOT_DETECTED` with alert if data is sufficient. A data gap must not become a missing-event claim. Multiple staff visits + one activation => ambiguous. Arrival of a new zone estimate doesn't silently discard old pending opportunity.

## Incident and exception policy

Alert lifecycle is separate from opportunity lifecycle. Acknowledgment changes alert review state, NOT completion/association. Resolutions require reason, authorized reviewer and supporting evidence. Emergency clinical care continues independent of software rules; any override logged actor/time/reason/linked case. Buzzer repeats obey policy cooldown and all triggered reminders remain auditable. Unknown visitor remains Unknown/Visitor unless registered temporary credential exists.

## Scenario action DSL

Define scenarios as declarative JSON/TypeScript objects:

`{ id, ward, title, preconditions, actorIds, deviceIds, actions:[{tMs, type, payload}], expectedStates, expectedAlerts, expectedAudit, groundTruth? }`

Supported actions: `MOVE_ACTOR`, `RFID_SCAN`, `BLE_OBSERVATION`, `PROXIMITY_OBSERVATION`, `START_CARE`, `END_CARE`, `DISPENSER_ACTIVATE`, `ARRIVE_CHECKPOINT`, `NETWORK_DOWN`, `NETWORK_UP`, `DEVICE_FAULT`, `DEVICE_RECOVER`, `ALERT_ACK`, `REVIEW`, `OVERRIDE`. A single authoritative clock drives both animation and event scheduling. Playback at x1/x2/x4, pause/step/resume, seedable repeatability, unique scenario-run IDs; no random KPI mutation. Scenario event records contain `source=SIMULATED`.

## Mandatory scenario catalog

| ID | Flow | Core result |
|---|---|---|
| GW-01 | Staff D01 RFID B01, activation, next RFID B02 | Previous opportunity uniquely associated; no false alert |
| GW-02 | RFID B01, no activation, RFID B02 | Previous `EVENT_NOT_DETECTED`, next visit opens, buzzer+audit |
| GW-03 | Staff badge B01 and configured pre-contact checkpoint | Reminder before simulated contact if event pending |
| GW-04 | Two staff active B03, one dispenser activation | `NEEDS_REVIEW`, not associated with both |
| GW-05 | 3 visitors + nurse at B04 | Visitor instruction/check-in; never fabricated RFID staff identification |
| GW-06 | Unknown/revoked badge at B02 | Identity unverified, audit, care unrestricted |
| GW-07 | Person passes without badge tap | RFID has no observation; if optional proximity sensor installed, only anonymous signal |
| ICU-01 | D01 tag stable at ICU-B01 + explicit workflow + activation | Presence estimate and properly qualified association |
| ICU-02 | D01 stable zone + pre-contact checkpoint, no activation | Early reminder without physically blocking care |
| ICU-03 | Supported ICU exit with missing required event | Missing event alert after hysteresis and checkpoint |
| ICU-04 | BLE tag fleeting near ICU-B02 | Incidental/uncertain, no accusation |
| ICU-05 | Tag received similarly by ICU-B01/B02 | Zone ambiguity; no exact bed assignment |
| ICU-06 | Temporary packet loss | No immediate exit |
| ICU-07 | Two registered tags, one dispenser activation | Needs-review rather than double-cleared |
| ICU-08 | Untagged visitor | Unknown; cannot identify by BLE alone |
| SYS-01 | Dispenser sensor fault or node failure | `DEVICE_FAULT` / `DATA_GAP`, not hygiene failure |
| SYS-02 | Network disconnect, queue, reconnect | Preserve event IDs; idempotent replay, visible offline state |
| SYS-03 | Emergency intervention with authorized override | No block, actor/reason/time logged |
| TECH-01 | Shared station eight ordered steps | Per-step result and session audit with disclaimer |
| TECH-02 | Camera cannot see hands | `UNABLE_TO_ASSESS`, not pass |
| SEC-01 | Unauthorized role tries export/config change | Permission rejected and security audit |

## Rules tests should assert

- Same staff previous visit survives next visit creation; no pending records silently wiped.
- Dispenser event is stored even if no matching visit; unmatched != missing identity guessed.
- Ambiguity if multiple plausible visits; both remain unresolved where policy requires.
- Receipt timestamp stored separately from device time; clock drift detectable.
- Idempotency key and event ID prevent duplicates on reconnect.
- Alert acknowledgment does not change hygiene opportunity to `EVENT_ASSOCIATED`.
- An event from faulted/offline device cannot justify a negative claim.
- Retry later activation adds linked resolution evidence and audit, not retroactive removal of original alert.
- Staff/visitor identities remain pseudonymous where role requires.
