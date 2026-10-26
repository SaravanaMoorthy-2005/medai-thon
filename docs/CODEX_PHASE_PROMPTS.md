# Copy-paste continuation prompts for long Codex sessions

Use `CODEX_MASTER_PROMPT.md` first. If the task exceeds a single Codex execution, paste one phase prompt at a time, preserving the same repo and reading `TASKS.md`. Require actual verified outputs; no claim that something is done from intention alone.

## Phase 1 — Foundation, repo and data

> Read `AGENTS.md`, `CODEX_MASTER_PROMPT.md`, `docs/PRD_ALIGNMENT.md`, `docs/DATA_API_REALTIME.md`, and `TASKS.md`. Implement the local-first monorepo, real SQLite persistence, migrations and seed for 4 General Ward beds and 3 ICU BLE zones, six roles, source provenance, a working premium shell with 12 navigable modules, core typed event schemas, and stable backend run commands. Build, lint/typecheck/test, document actual commands and status in TASKS. Don't produce static placeholder success cards.

## Phase 2 — Architectural 3D cutaway

> Implement `docs/THREE_D_WORLD.md` and `docs/UI_UX_DESIGN_SYSTEM.md`. Build a clean performant interactive 3D hospital cutaway with 4 General and 3 ICU zones, shared station, accurate bed equipment, plausible doctors/nurses/patients/visitors, animations, camera fly-to/orbit/pan, object selection inspector, 2D fallback, and zero label overlap. Wire device IDs to shared metadata and demonstrate model interaction in browser. Take screenshots at required viewports and verify layout.

## Phase 3 — Real ward logic

> Implement `docs/RULES_AND_SCENARIOS.md` and `docs/DATA_API_REALTIME.md` as tested backend code. Create device ingestion, idempotent raw events, visits, opportunities, same-staff RFID next-bed checks, ICU BLE filtering across 3 nodes, configured pre-contact checkpoint, independent dispenser association, ambiguity, device/data faults, immutable audit, alerts and overrides. Unit/integration test the specified General and ICU cases; update TASKS with actual passing tests.

## Phase 4 — Simulation, live analytics, alerts

> Implement a deterministic timed scenario runner with named run IDs. Connect scenario events to the same backend API and stream all outcomes to 3D scene and stored dashboard. Build scenario selection/play/pause/step/replay, clinical-safe alerts and audit inspector, charts with real computed values and filters, and correct acknowledgement versus resolution states. Persist over refresh. Test duplicate reconciliation and all required scenario classifications.

## Phase 5 — TWO exploded hardware assemblies

> Implement Module 12 exactly as `docs/HARDWARE_EXPLODED_VIEWS.md` and the UI design contract specify. Build real 3D General Ward RFID and ICU BLE node assemblies, exploded transforms with progress slider, reassemble, part isolation, ghost enclosure, connection types and signal walkthroughs. Provide correct RC522/SPI/GPIO vs BLE radio/Wi-Fi paths, separate wearable card/tag and optional IR parts. All text belongs in docked lists/inspector; no overlapping floating labels. Share device metadata with hospital twin. Use viewport screenshots for 0%/50%/100% states; fix any collisions or clipping. Run typecheck and viewer UI tests.

## Phase 6 — Shared station, validation, privacy and release QA

> Implement eight-step configurable shared camera guidance with MediaPipe and safe `UNABLE_TO_ASSESS`, store derived results but no raw video; implement validation comparison with separate ground truth and computed metrics; device/credentials/roles/admin settings and audited report exports; apply safety/privacy constraints. Run lint, typecheck, unit, integration, Playwright and production build. Report honestly which capabilities are implemented versus optional/unmeasured. Capture clean visual QA screenshots and record blockers in TASKS.

## Phase 7 — Product polish without making it fake

> Use remaining effort to fix end-to-end defects, 3D load/performance, broken interaction states, text overlaps, dashboard filter inconsistencies and incorrect terminology. Do not replace backend functionality with animations. Review `docs/TEST_AND_ACCEPTANCE.md`. Deliver a 3–4 minute guided demonstration mode, accessible UI controls and reproducible local launch commands. Don't say complete until acceptance tests pass and the actual browser was inspected.

## Restart after context loss

> Resume implementation of HYGIENE OS from the repository. First read `AGENTS.md`, `CODEX_MASTER_PROMPT.md`, `TASKS.md`, and all related docs. Inspect actual code and run tests to establish current state. Continue the highest-priority unchecked vertical slice. Never overwrite implemented functionality with a fresh redesign or assert prior phases are done without verification.
