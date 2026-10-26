# HYGIENE OS — Build tasks / implementation ledger

**Status:** Working local research prototype implemented on 27 October 2026. Twelve navigable modules and core evidence workflows are verified. The entire original acceptance matrix is NOT yet complete; open gates and limitations remain below.

## Gate A — Environment + UI shell
- [x] Monorepo boots without cloud API keys
- [x] Typed shared event schemas and database migrations
- [x] Auth/demo role enforcement and source-mode badges
- [x] Premium accessible layout + functional 12-module navigation
- [x] Seed default 4 General beds + 3 ICU zones + shared station

## Gate B — 3D hospital
- [x] Cutaway original model, selectable bed/ward objects
- [x] Camera fly-to/orbit/pan/zoom/reset and 3D/plan/list fallback
- [x] Animated doctor/nurse/visitor characters with stable IDs
- [x] Selection inspector and compact safe scene labels
- [ ] Scene/event synchronization through authoritative state

## Gate C — Ward event engine
- [x] Append-only raw observation ingest + server receipt timestamps
- [x] RFID UID validation and next-bed same-staff checkpoint
- [x] ICU three-zone BLE estimates, dropout/overlap uncertainty
- [x] Independent opportunity and dispenser association evidence
- [x] Ambiguity, missed events, alerts, fault/data gap, overrides
- [x] Idempotency, buffering/reconnect, audit history

## Gate D — Simulated scenarios and analytics
- [x] Deterministic scenario clock + scripted actions and playback
- [x] General normal/missed/ambiguous/visitor/badge scenarios
- [x] ICU normal/pre-contact/exit/overlap/dropout/outage scenarios
- [x] Persistent event feed, graphs, filters and drill-down
- [x] Alert queue + review/acknowledge/escalate/resolve RBAC

## Gate E — Hardware explorer (new)
- [x] General Ward RFID bedside assembly in actual 3D
- [x] ICU ESP32 BLE bed-zone assembly in actual 3D
- [x] Explode slider/reassemble/orbit/part selection/isolated view
- [x] Correct signal/power/radio legends and exterior Wi-Fi node
- [x] Shared metadata with ward objects and device inspector
- [x] Component labels docked; no clipping/overlap at target resolutions
- [ ] Exploded-view step-through signal demonstrators

## Gate F — Technique + validation + administration
- [x] Configurable eight-step guidance protocol and voice/text
- [x] Webcam + MediaPipe + denied/unavailable/low-confidence states
- [x] Separate station dispenser events and session audit
- [x] Ground truth not visible to predictions; calculated metrics
- [ ] Reports/exports logged; staff/credentials/devices/privacy settings
- [x] Biomedical/IT and Auditor roles tested

## Gate G — Evidence / QA
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run test:e2e`
- [x] `npm run build`
- [x] Confirm scenario events survive refresh
- [x] Confirm data-source label and no fabricated compliance claims
- [x] Visual screenshot review at 1366×768, 1440×900, 1920×1080, 1280×800
- [x] 125% zoom and narrow-screen no-overlap inspection
- [x] Record actual test results and unresolved limitations below

## Session progress notes

Add dated entries here after every coding session:
- Files changed:
- Commands run:
- Passed/failed tests:
- Known blockers:
- Next smallest vertical slice:


## 27 October 2026 — implementation and verification

### Phase 1: foundation and event architecture
- Read AGENTS, master prompt, every subsystem document, TASKS, README and the integrated DOCX PRD. The repository contained specifications only and no Git history/application. The only uploaded reference file was the integrated PRD; Cutaway was inspected through its public repository/documentation.
- Created the React/Vite/TypeScript application, Fastify service, Zod contracts, SQLite schema migration and non-destructive seed, six local demo roles, 12-module navigation, source badges and a consistent original light UI.
- Source observations are immutable; interpretations and append-only audit are distinct. IDs, receipt/device clocks, policy versions, correlation IDs and idempotency are retained. SQL triggers reject edits/deletions to raw events and audit.
- Commands verified: `npm install` with a generated dependency lock, `npm run seed`, `npm run db:migrate`, `npm run dev`. Node 24.16.0 / npm 11.13.0. No paid services or credentials.

### Phase 2: hospital and bedside vertical slices
- Authored the cutaway with four General beds, three ICU zones, corridor, windows, curtain rails, bedside equipment, patient figures, two doctors/two nurses/two visitors, nurse desk and one shared camera station.
- Functional orbit/pan/zoom, eased ward/bed focus, actor-destination focus, plan/list, equipment selection, fullscreen and docked controls. Mobile uses the bed list. Patients and staff are procedural figures; this is not a photorealistic asset set.
- RFID same-staff next-bed checkpoint preserves the earlier record and opens the next visit. BLE uses sample persistence, recent-window means and adjacent-signal ambiguity, with a separate clinical workflow checkpoint.
- Fault/recovery cannot erase a data gap. Multi-staff dispenser events remain unassigned. Acknowledgment does not mark an opportunity complete. Reviewed resolution and emergency override preserve history.

### Phase 3: scenarios, analytics, station and hardware
- 21 persistent, isolated scripted scenario definitions; play/pause/step/resume/speed/replay. Software outage queue survives persistence and reconciles original event IDs without double counting.
- Data-derived charts and source tables share ward/bed/device/status/date filtering. Event inspection exposes original payload and clocks. Ward CSV exports are authorized and audited.
- Both WebGL assemblies have deterministic transform vectors, explode/reassemble, orbit/turntable, camera presets, isolate, ghost/hidden housing, connection display, wireframe mode, signal-connection walkthrough, real backend demo actions and optional three-node ICU deployment.
- Shared metadata supplies ward device descriptions and hardware descriptions. Rich text is docked outside both canvases.
- Local MediaPipe WASM/model and bundled font eliminate external runtime service dependencies. Ordered eight-step guided-only sessions persist unknown estimates; synthetic-video model execution and denied-camera fallback were browser-tested. No raw video is uploaded or stored.
- Validation stores ground truth separately and computes comparisons/confusion counts. Physical RFID/dispenser 19/20 targets remain NOT YET MEASURED.

### Verification evidence
- `npm run typecheck`: PASS.
- `npm run lint`: PASS for authored source; bundled third-party MediaPipe runtime is excluded from lint, retaining its upstream code unchanged.
- `npm run test`: **45 passing tests** across domain/scenario and API integration files.
- `npm run test:e2e`: **6 passing browser tests** before adding a dedicated analytics-filter assertion; final result is appended below.
- `npm run build`: PASS. Three.js and chart chunks still trigger Vite size warnings; no performance/FPS benchmark is claimed.
- Captured 29 screenshots: command center, hospital/analytics/hardware at five required sizes, focused wards, RFID and ICU assemblies at 0/50/100%, three-node illustration, camera model/fallback, validation and 125% CSS zoom. Final evidence is copied to `artifacts/qa/`.
- Browser tests assert page-level overflow is absent and inspector/canvas rectangles do not intersect on desktop. Screenshots were visually reviewed for readable docked descriptions and control separation. Browser-native 125% zoom is not separately verified; the test uses CSS zoom at 1.25.
- Initial E2E failure: alert badge changed its navigation accessible name. Fixed with a stable aria-label, then rerun passed. Sandbox localhost restrictions required approved local execution for browser QA. Test servers now use separate ports and a separate SQLite file, preserving the main demo database.
- Build, test and screenshot artifacts are real outputs, not prospective claims.

### Deviations / unfinished acceptance work
- Root package contains typed frontend/server/shared subprojects; separate npm workspaces were not introduced. Custom CSS replaces Tailwind for the original design. SQLite entity projections use dedicated JSON-backed tables rather than fully normalized columns/FKs. PostgreSQL migration is future work.
- Actor destinations follow authoritative accepted events, but frame-exact simulation-clock animation, collision-aware paths and a full locomotion/interaction clip system remain incomplete. Camera follow currently follows destination zones. Wall masking is a fixed architectural cutaway, not dynamic occlusion culling.
- Hardware connection walkthrough highlights actual interface paths and launches persistent scenarios; moving electrical/radio packets, full sensor-actuation animation, shared-controller deployment selection and exact electrical validation remain incomplete. No fabricated pinout or performance claim is made.
- Hardware ingestion intentionally rejects HARDWARE provenance. Secure provisioning, firmware adapters, real device authentication, physical buffering, automatic heartbeat expiry and measured uptime are not implemented.
- Demo role restrictions are backend enforced. Production identity, session expiry, ward/own-staff read scoping, registration of new staff identities and full configurable device-location mapping remain incomplete.
- Clinical technique classifier/approved protocol and real-camera labeled validation remain incomplete. Visible landmarks are not an approved step classifier; all visible-step sessions remain retry-recommended rather than claimed clinical success.
- Automated retention deletion, scheduled alert escalation/repeat delivery, measured latency/interaction-time analytics, shift/staff filters and validation CSV export remain unfinished. Retention configuration is stored only.
- The full original screenshot matrix (every dense/long-label combination, every hardware progress at every viewport, native browser zoom), keyboard audit and measured FPS benchmark remain open. No hidden waiver of these acceptance requirements.
- Next smallest slices: authoritative actor clip clock/path routing; per-role scoped queries and real device provisioning; then full acceptance-matrix closure. See IMPLEMENTATION.md for runtime and limitations.

### Final verification and saved evidence
- Final `npm run test:e2e`: **7 passed (1.3 minutes)**, including shared analytics filters and denied Auditor CSV export. Domain/API suite remains **45 passed**; no domain changes followed that run.
- Final `npm run build` (including TypeScript), and `npm run lint`: **PASS**. Vite still reports large Three.js/chart chunks; performance acceptance is not claimed.
- `node scripts/production-smoke.mjs`: **PASS** against the built application on port 3001: cookie session, live snapshot, hospital WebGL, and no browser page errors.
- Visual review caught a 125% CSS-zoom canvas height feedback loop that horizontal-overflow assertions missed. Fixed the canvas to a bounded, positioned container, retained viewport-aware camera framing, and added bounded-height/stable-height regression assertions. The focused responsive test passed, followed by all seven browser tests. The final 125% screenshot was visually inspected again.
- Retained **30 screenshots** under `artifacts/qa/`: 29 browser QA captures plus the production hospital capture. Required desktop sizes, mobile fallback, focused wards, both assemblies, local model and denied-camera states are represented. Native browser zoom and the entire original dense-content/FPS matrix remain open as recorded above.
- Development preview remains available at http://127.0.0.1:5173/ with persistent SQLite evidence. Main demo has four active General Ward beds and three active ICU beds; the temporary QA extension bed is deactivated, with its audit retained.
