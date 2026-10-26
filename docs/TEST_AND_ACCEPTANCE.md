# Validation & acceptance — integrated PRD plus exploded-view UI

## Principle

The software distinguishes scripted ground truth from engine predictions; clinical quality claims are not made. PRD 19/20 controlled RFID and dispenser trial targets are **tests to perform**, not results. Display real measured results with methodology/run IDs, or `NOT YET MEASURED`.

## Automated test matrix

| Test ID | Requirement and verification |
|---|---|
| T001 | Home provides General and ICU routes, data-source label and actual state |
| T002 | Admin adds a General bed and ICU zone through UI (default 4 GW, 3 ICU), persisted |
| T003 | Registered RFID scan stores card credential reference, reader/bed ID, device time, receipt time, event ID |
| T004 | Unknown/revoked UID classified identity-unverified without blocking care |
| T005 | General D01 scans B01 then B02 without dispenser -> prior missing alert + audit, new visit still opened |
| T006 | General D01 B01 activation uniquely matched -> preceding checkpoint passed at B02 scan |
| T007 | Two staff candidates for one activation -> ambiguous, no false double success |
| T008 | Unscanned General-bed presence is NOT silently attributed to registered staff from RFID alone |
| T009 | ICU three BLE nodes emit plausible RSSI observations and estimated presence; no exact-contact claims |
| T010 | Adjacent equal-signal BLE tags -> uncertain; no unearned exact bed resolution |
| T011 | Brief BLE signal dropout -> hysteresis prevents immediate exit |
| T012 | ICU pre-contact checkpoint based on supporting workflow -> reminder if activation missing |
| T013 | ICU exit-without-activation evaluated at configured checkpoint, not from single packet loss |
| T014 | Dispenser sensor fault -> `DEVICE_FAULT`/`DATA_GAP`, not automatic staff non-compliance |
| T015 | Network buffer replay idempotent; no duplicate counts or events |
| T016 | Alert acknowledgment doesn't create `EVENT_ASSOCIATED` or `RESOLVED` hygiene opportunity |
| T017 | Authorized emergency override actor/time/reason/linked opportunity; care proceeds |
| T018 | Unauthorized admin/export action fails backend permission check and logs security event |
| T019 | Append-only audit, device and server timestamps, old/new statuses, correlation IDs and correction events |
| T020 | Eight configurable technique steps; missing camera/low confidence => `UNABLE_TO_ASSESS` |
| T021 | Dedicated guidance station activation cannot be falsely attributed to a different bedside event |
| T022 | Recorded scenario event updates event table, metric and ward 3D state; survives reload |
| T023 | Deterministic scenario replay has new run ID, equivalent classification, no unintended duplicate in analytics |
| T024 | Validation truth stored separately; computed confusion matrix/latencies from measured runs |
| T025 | General hardware kit full 0..1 explode/reassemble returns parts exactly to home matrices |
| T026 | ICU exploded kit has three-node illustration and separate wireless BLE tag (no copper wire) |
| T027 | Hardware part inspector highlights correct mesh and displays correct SPI/GPIO/radio/power paths |
| T028 | No long labels overlap canvas components; label collision checks at all reference resolutions |
| T029 | Role-based summary privacy: no unnecessary personally identifying data on default views |
| T030 | Disconnected device or camera doesn't crash entire app; readable fallback displayed |

## Visual regression checklist

Create image captures for `Command Center`, `3D Hospital overview`, `General B01 selected`, `ICU B01 selected`, `hardware GW assembled`, `hardware GW 100% exploded`, `hardware ICU assembled`, `hardware ICU 100% exploded`, `multistaff ambiguity`, `technique camera denied`, `analytics with long labels`, `validation matrix`, and narrow viewport fallback. Viewports 1366×768, 1440×900, 1920×1080, 1280×800, 375×812; 125% browser zoom for desktop. No clipping, horizontal page overflow, covered buttons, text projected atop 3D objects, or unreadable status in color-only form.

## Validation measurements

Collect approved manual observations for separate controlled scenarios. For each run record `groundTruthLabel`, `systemClass`, `scenarioId`, `runId`, `policyVersion`, `timestamp`, `reviewer`, `deviceStatus`, `latencyMs`, `interactionDurationMs`, `errorDescription`. Compute precision/recall with explicit positive class definition, false alert and missed rates, zone assignment errors, ambiguity and latency distributions. Prefer denominator and unavailable-data explanations to meaningless percentages.

## Commands to implement

`npm run dev`, `npm run db:migrate`, `npm run seed`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`.

If any command fails, show the failing test and fix or record limitation; do not mark passed without actually running it.
