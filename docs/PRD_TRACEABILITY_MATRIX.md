# Integrated PRD FR-001..FR-026 requirement traceability

This matrix uses **the actual integrated PRD requirement IDs**, preserves their meaning, and links them to modules/tests. For hardware exploded visualization see the separate user-addition trace at end.

| PRD ID | Requirement gist | Main module(s) | Verification |
|---|---|---|---|
| FR-001 | Home offers General and ICU | 01 | T001 |
| FR-002 | Admin configurable hospital/ward/bed stable IDs | 11, 02 | T002 |
| FR-003 | Staff registry and credential mapping | 11, 03, 04 | T003,T009 |
| FR-004 | Revocation/unknown badges | 11, 03 | T004 |
| FR-005 | RFID reader uniquely mapped to bed/zone | 03, 11, 12 | T003 |
| FR-006 | BLE nodes mapped to ICU zones and last-seen | 04, 11, 12 | T009,T010 |
| FR-007 | Dispenser ID and location mapping | 03, 04, 11, 12 | T006,T021 |
| FR-008 | Unique event IDs and both timestamps | 05, 11 | T003,T019 |
| FR-009 | Visits and required opportunities | 03, 04, 05 | T005,T012 |
| FR-010 | Previous GW visit checked at next same-staff bed scan | 03, 05 | T005,T006 |
| FR-011 | ICU zone estimates preserve uncertainty | 04, 05 | T009,T010,T011 |
| FR-012 | Dispenser observations separate from interpreted status | 05, 07 | T006,T007 |
| FR-013 | Unmatched/ambiguous matches | 05, 08 | T007 |
| FR-014 | Audible/visual alerts at missing checkpoint | 03, 04, 08 | T005,T012,T013 |
| FR-015 | Alert acknowledgment separate from completion | 08 | T016 |
| FR-016 | Authorized resolution/override reason + audit | 08, 11 | T017 |
| FR-017 | Bed status, visits, alerts, device health dashboard | 01, 07 | T022 |
| FR-018 | Shared station ordered technique and session | 09 | T020,T021 |
| FR-019 | Low confidence or unknown camera outcomes | 09 | T020 |
| FR-020 | Audit source/state/config/alert/export/override | 08, 11 | T019 |
| FR-021 | Analytics filters: ward, bed, staff scope, device, status, date | 07 | T022,T029 |
| FR-022 | Offline device/network detection | 11, 07 | T014,T015 |
| FR-023 | Buffer/reconcile events, avoid duplicates | 05, 11 | T015 |
| FR-024 | Simulation/scripted scenarios | 06, 10 | T023,T024 |
| FR-025 | No status blocks emergency access | 03, 04, 08 | T017 |
| FR-026 | Privacy, role access, retention, export controls | 11, 07 | T018,T029 |

## User-requested extensions (not in original PRD)

- UX-3D: full interactive hospital cutaway with actors, real scenario movement, inspector and smooth camera (Module 02; T025/T028 related 3D QA).
- HW-01: General Ward RFID hardware exploded view (Module 12; T025,T027,T028).
- HW-02: ICU BLE hardware exploded view (Module 12; T026,T027,T028).
- UI-01: no text collisions; docked labels and automated viewport regression tests (all pages; T028).
- DEV-01: Codex-ready AGENTS.md, phase prompts, implementation task tracker, UI/3D/engine/test specifications.

## Safety gates trace

- ICU 3 zones required by integrated PRD p1, p3–4 and p9.
- Configured 8-step shared station required p4 and p9; exact local procedure open.
- Ambiguous staffing, outages, no physical lock and no clinical proof are repeatedly emphasized p1–4 and p8–10.
- Validation acceptance targets 19/20 for selected scan/sensor hardware are **not** synthetic achieved results; report actual measurements only.
