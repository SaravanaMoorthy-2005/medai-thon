# CODEX MASTER BUILD PROMPT — HYGIENE OS v2.0

> Paste this prompt into Codex at the root of an empty repository **after** copying the rest of this package into that repository. Attach `Complete_Smart_Hand_Hygiene_System_PRD.docx` and the two earlier ward PRDs if available. The updated **27 October 2026 integrated PRD** takes precedence for scope and terminology. This is a build specification, not a claim that the application is already implemented.

## 0. You are the implementation agent

Act as a senior TypeScript full-stack engineer, React Three Fiber digital-twin specialist, clinical-quality workflow engineer, privacy engineer, product designer, data visualization expert, and QA lead. **Write, run, debug, test, and refine application code**, not just mockups or an implementation proposal. Persist progress and continue phase by phase. Do not state a feature is functional until an end-to-end test demonstrates it.

Read `AGENTS.md`, `README.md`, `TASKS.md`, and all `docs/*.md` before coding. Use `docs/PRD_ALIGNMENT.md` as the interpretation guide and the integrated PRD as the authoritative requirements source. Check licenses and attribution before reusing third-party code or 3D assets.

**Product:** Privacy-Preserving Hand-Hygiene Opportunity and Technique Monitoring System, branded **HYGIENE OS**.

**Core deliverable:** A premium web application with a genuine architectural-cutaway 3D hospital, configurable **4 General Ward beds and 3 initial ICU BLE zones**, working RFID and BLE workflows, a shared eight-step guidance station, sensor-fusion/rules processing, replayable scenarios, persistent live analytics, audited alerts, role-based administration, validation lab, and an interactive **two-tab hardware exploded-view explorer**. Do not replace any part of the working application with a screenshot/video.

### Constraints that supersede styling preferences

- RFID scan is an identification/access-request event, **not proof of touching a patient**. Unscanned entry is not RFID-detectable without a separate sensor.
- BLE RSSI is uncertain proximity information, **not exact positioning**. Use filtering, hysteresis, confidence, overlap handling and non-committal states.
- A dispenser sensor records **activation**, not proof of product delivery, hand coverage, adequate volume or clinical compliance.
- Computer vision of hands supports **guidance/observable movement estimation**, not definitive technique verification. Camera operation only at **one shared station**; no continuous video surveillance at beds; do not store raw video by default.
- The General Ward uses the **next badge scan by the same staff member** as the chosen retrospective checkpoint for the preceding visit. The previous pending event is evaluated without silently clearing it, and the new visit opens regardless. Add an earlier configured reminder where care policy requires hand hygiene before contact.
- The ICU uses **three configured bed zones**, BLE tag/node observations and explicitly configured clinical checkpoints. A pre-contact reminder cannot be inferred solely from momentary BLE proximity; use explicit simulated workflow/care-start evidence or a configured additional sensor. Exit-only checks do not replace earlier clinical checkpoints.
- Ambiguous attribution, offline sensors and data gaps must **never produce a fabricated success or misconduct finding**.
- Alerts, physical doors and the simulated clinical environment **must never block urgent patient care**. Overrides require authorized actor, reason, timestamp and linked record.
- Separate raw device observations, inferred workflow classifications, alert acknowledgement and evidence-based resolution.
- The first version is an **academic, controlled simulation**, not an approved/clinically validated medical product. Visibly label hardware vs simulated sources.

## 1. Primary user experience: premium and unmistakably real

Reference for interaction principles: https://imsemoo.github.io/cutaway/ and source https://github.com/imsemoo/cutaway. Study it if network access permits. Use its **architectural cutaway, camera fly-to, multi-level inspection, context inspector, simulation timeline and efficient rendering principles**. Do not clone its code or layout without license review or reproduce its branding. Develop an original healthcare UX.

Visual language: quiet Swiss-modernist / high-end hospital operations software. Off-white `#F6F8F9`, white `#FFFFFF`, dark navy `#14283B`, body text `#182B3B`, muted slate `#697D8B`, General Ward blue `#397EB3`, ICU teal `#168C82`, warm amber for uncertainty, restrained red for alerts. Use Inter or a reputable licensed font, clear 8px-based spacing, restrained 1px separators, subtle elevation, minimal iconography, accessible contrast. **No “AI slop”: no neon gradients, pointless glow, glass cards everywhere, disconnected KPI tiles, fake 3D holograms, ugly emoji, auto-scrolling clutter or decorative fake data.**

### Required non-overlap layout contract

Use a responsive application shell with sticky topbar, collapsible left sidebar (240px expanded / 68px collapsed), central content and collapsible right inspector (320–380px). Keep 3D canvas and its controls inside a grid/flex layout with `min-width:0` and clipping rules. Reserve bottom 160–220px for a collapsible timeline instead of floating it over the scene. No primary text labels overlay animated actors, hospital beds or each other. Place durable labels and rich descriptions in a **right-side inspector and aligned event sidebar**, and use tiny minimal scene markers only as interaction anchors.

For in-canvas anchored tags, implement camera projection, per-frame bounding-box collision resolution, max-visible-label budget, occlusion visibility, and safe-area exclusion near controls; hide/reduce low-priority labels if crowded. Never just position dozens of DOM labels absolutely with unrestricted offsets. Tooltips should reposition or flip; event notifications should stack in a reserved toast region outside the main scene. No overlap/clipping at 1366×768, 1440×900, 1920×1080, 1280×800 and 375px mobile (show 2D fallback if needed). Test at 100% and 125% zoom. See `docs/UI_UX_DESIGN_SYSTEM.md`.

## 2. Build exactly 12 navigable modules

01. **Hospital Command Center**: Home with two hero ward selections (General Ward / ICU), data-source indicator, bed cards, active visits, open alerts, events, device health, filtering, deep links to 3D objects. Every KPI derives from backend data.

02. **Interactive 3D Hospital**: Original, navigable architectural cutaway with General Ward GW-B01..GW-B04, ICU ICU-B01..ICU-B03, connecting hallway, shared guidance station, doctor/nurse/patient/visitor characters, physically plausible equipment, bed selection, controlled camera fly-to, orbit/zoom/pan, level/focus, optional 3D/plan/list views, follow actor, scenario playback, device inspection. The 3D view is the main experience, not a decorative card.

03. **General Ward Monitoring**: RFID at each configured bed; tap badge → validate UID mapping/revocation → open staff/bed visit and pending policy checkpoint; bedside dispenser activation and uniquely supported association; next scan by SAME staff evaluates previous visit before opening the new visit; missing event → `EVENT_NOT_DETECTED`, reminder, buzzer/visual signal and append-only audit; previous state cannot be silently cleared. Visitors are managed via approved policy/manual/temp badge path; multiple staff/one dispenser → `NEEDS_REVIEW`; unscanned physical presence must not be magically detected by RFID.

04. **ICU Ward Monitoring**: Exactly THREE initial zones, extensible through admin; BLE tags advertised to ESP32 BLE nodes, tag observations + signal quality, persistence/hysteresis/adjacent-bed uncertainty, simulated bed-space/care-start checkpoints, separate visits per staff, dispenser events reliably associated or ambiguous, pre-contact reminder based on supporting opportunity evidence, exit-without-activation check if configured, overlapping tag handling, visitor Unknown/Visitor, low tag battery/receiver fault/outage. Distinct from RFID, no tap in normal ICU flow.

05. **Opportunity Detection Engine**: Show explainable source evidence → identity matching → zone estimate → visit → policy checkpoint → opportunity confidence → dispenser-to-visit matching confidence → classification/alert. Implement backend rule engine, not client-only labels. Independent confidences for identity, zone, opportunity and activation association. Classifications include `DETECTED`, `VISIT_OPEN`, `HYGIENE_PENDING`, `ACTIVATION_RECORDED`, `EVENT_ASSOCIATED`, `EVENT_NOT_DETECTED`, `NEEDS_REVIEW`, `ALERT_ACKNOWLEDGED`, `RESOLVED`, `OVERRIDE_RECORDED`, `DEVICE_FAULT`, `DATA_GAP`; additional display-only classes such as incidental proximity are allowed. Avoid pretending a confidence score is a clinical probability.

06. **Scenario Simulation Lab**: Data-driven deterministic scenario runner; select, run, pause, step, resume, replay, reset, speed, inspect rule trace, review actual vs expected. Visual character animation emits events to the SAME backend ingestion as hardware mode; no direct chart mutations. Support normal/missed next-bed RFID, pre-contact ICU reminder, BLE overlap, transient dropouts, incidental proximity, multi-staff dispenser ambiguity, unregistered badge, visitors, network/data faults, authorized emergency override, camera unable to assess. Link scenarios to 3D camera focus and persistent run IDs.

07. **Live Analytics Dashboard**: Computed KPIs, activity over time, ward/bed/shift filters, device availability, activation-associated opportunity estimates, ambiguous/unmatched events, unresolved alerts, repeat alerts, acknowledgements and resolution times, guidance sessions, test precision/recall and latency when genuinely measured. Filters should affect both charts and table; drill down to raw events. Show `NOT YET MEASURED` for absent validation data; never fabricate clinical compliance rates. All values persist across refresh and update through a resilient live stream.

08. **Alert & Review Center**: Queue, severity, `OPEN` → `ACKNOWLEDGED` → `UNDER_REVIEW` → `RESOLVED/CLOSED_WITH_EXCEPTION`, escalation, actor/time/reason, incident linking, alert sound cooldown and repeat logic, separate event completion and alert acknowledgement; preserve append-only history and correction events. Only allowed roles can resolve/override.

09. **Technique Guidance Station**: ONE shared camera+screen+speaker+laptop+dedicated station dispenser. Configurable **eight-step hospital-approved** procedure and protocol version, voice/text instructions, station activation separate from bed activations, MediaPipe Hand Landmarker local video processing, hand visibility and landmark estimation, step-level confidence, `ASSESSMENT_COMPLETED` / `RETRY_RECOMMENDED` / `UNABLE_TO_ASSESS`; process camera locally, don't save raw video by default. Do not assert full-surface coverage. Do not invent final hospital-approved protocol contents: supply explicitly labeled, editable demo steps requiring hospital confirmation. Link guidance results to staff only if reliable identity.

10. **Validation & Testing Lab**: Ground-truth labels separated from engine predictions. Deterministic scripted test comparisons, confusion matrix, false alert and missed event rates, wrong-zone classification, attribution accuracy, time from checkpoint to alert, staff interaction time, offline reconciliation, 19/20 controlled RFID and dispenser trials goals as *planned acceptance* (not fabricated pass results). Test reports, CSV exports, measured/unmeasured distinction.

11. **Devices, Privacy & Administration**: Hospital/ward/bed configuration without editing source; staff credential enrollment/revocation; registered device-ID mapping and last-seen/firmware/fault state; six roles (doctor/nurse, supervisor, infection prevention, biomedical/IT support, administrator, auditor); least-privilege backend checks; hospital policy versions, time windows, escalation, offline buffering; privacy and retention; export auditing; authorized emergency override. Missing device data → `DEVICE_FAULT`/`DATA_GAP`, not hygiene failure.

12. **Hardware Explorer — NEW**: An original, interactive two-tab 3D **exploded view** for **(A) General Ward RFID Bedside Kit** and **(B) ICU BLE Bed-Zone Kit**. Each is an actual manipulable 3D assembly, not a still image. Animated explode/reassemble, orbit/zoom, selected-part isolated highlighting, transparent enclosure, named part list outside the canvas, cable/connection overlays, sensor-event animation, step-by-step signal walkthrough, physical-vs-logical wiring legend, source citations/reference placeholders, per-part function and limitation. The 3D hardware kit must be geometrically consistent with devices shown on the hospital beds. Add the separately shared guidance station as a small non-exploded subpanel; the user specifically requests **two primary exploded assemblies**, not a third competing main tab. Read `docs/HARDWARE_EXPLODED_VIEWS.md` in full.

## 3. Hardware Explorer — acceptance contract (high priority)

**General Ward assembly:** protected enclosure, ESP32 Wi-Fi development board/controller, MFRC522/RC522 RFID reader with deliberate short-range tap, registered RFID badge/card as a detachable actor (not permanently installed electronics), mechanical dispenser and activation microswitch (or replaceable touchless compatible interface), local buzzer and status LED, suitable drive components where required, 5V-rated power input or protected USB board supply appropriate to selected ESP32 dev board, regulated logic voltages, routed cabling/connectors, optional clearly labeled IR proximity sensor, shared Wi-Fi router/backend shown externally with dashed wireless link. Place reader at bed-entry, dispenser/sensor next to bed, tag as carried object. The badge has no patient data. Do not use a fictional contactless long-range RFID reader. Treat module pinout as **board-specific TBD** until the actual dev board + RFID module are selected and electrical design reviewed.

**ICU assembly:** protected ESP32 BLE/Wi-Fi receiving node (internal ESP32 BLE can function as BLE receiver; do NOT invent an extra receiver PCB as mandatory), staff BLE wearable/tag as separate broadcasting peripheral, patient-bed dispenser and its activation sensor, local buzzer/status LED and drive circuitry, power input, protected housing, optional clearly labeled additional proximity sensor if required for disambiguation, Wi-Fi router/backend external as dashed links. Illustrate zone coverage as **approximate BLE signal observations**, not a physical hard boundary or exact distance. Support three copies of configured ICU bed-zone nodes in 3D hospital scene; exploded view represents **one reusable node/kit** and tag/dispenser, with optional quantity selector to explain 3-zone deployment.

**Both exploded viewers** must: animate parts on fixed pre-authored world-space vectors, 0..1 explode progress slider, Play/Pause, Reassemble, component isolation, turntable orbit, camera presets, exploded/assembled wireframe and ghost enclosure toggles, clean dimension-free diagram mode, device health/signal replay, physically plausible connector paths. Parts must preserve correct attachment geometry when reassembled; badges/tags detach as separate accessories, never falsely shown soldered to an enclosure. Connection graph MUST distinguish `SPI data` for RFID (where used), `GPIO input` for microswitch/button, `GPIO/buffered driver` for buzzer/LED, `BLE radio observations`, `Wi-Fi network` and `power`. Radio links must be dashed and not drawn as solid electrical wires. Any schematic is educational only and must say **not a validated fabrication schematic**. Respect 3.3V logic and module ratings; never blindly connect 5V logic to ESP32 GPIO. Do not fabricate a numerical cost, exact component specification, IP rating, pinout or supplier link.

**Labels:** All rich component names/descriptions go in an aligned docked part-list + inspector, with stable numerically keyed thin leader lines if desired. Do not stack floating text all over the assembly. Highlight a selected part in both list and model. Use client-rect collision avoidance and bounded overlay visibility. Check readability with multiple camera angles and fullscreen/windowed layouts. See hardware detail spec and UI design doc.

## 4. Data, API, security and real-time architecture

Use a TypeScript-first monorepo: React + Vite + TypeScript + Tailwind + accessible primitives + Zustand/TanStack Query + React Three Fiber/Drei + ECharts. Backend: Node.js Fastify + Zod + SQLite for local zero-account setup (migration-ready to PostgreSQL) + durable audit/event tables + WebSockets. Use MediaPipe Hand Landmarker in the browser. No paid services/keys required for the core prototype.

Tables minimum: Hospital, Ward, Bed, Staff, StaffCredential, Device, DeviceLocation, Visit, DeviceEvent, DispenserEvent, HygieneOpportunity, Alert, Reminder, TechniqueSession, TechniqueStepResult, Override, AuditLog, UserAccount, PolicyConfig, ScenarioRun, ValidationCase, GroundTruthLabel, ValidationRun. Additional SensorObservation / EventAssociation tables if beneficial. Stable device and server-receipt timestamps, event IDs, idempotency, source `SIMULATED`/`HARDWARE`/`MANUAL`, policy versions and correlation IDs. Raw observations are immutable and inference updates are linked, audited transitions, not silent edits.

API groups: authentication/roles; hospital/bed configuration; staff credentials; device registration/health and event ingestion; visits/checkpoints; opportunity engine/explainability; alerts/reviews/overrides; guidance sessions; analytics/report export; scenario control; validation; hardware explorer metadata. Authenticate devices and reject unknown IDs in HARDWARE mode. Set backend-side permission gates, not visual-only role restrictions. No production patient data.

WebSockets must support connection state, missed-update catch-up/initial snapshot, event sequence IDs and deduplication. On network outage show device as `OFFLINE` or `DATA_GAP`; local simulator buffer + reconcile after rejoin without losing events or double counting. If connected hardware buffering cannot be implemented, be transparent and test the software queue only.

Aggregations should describe **estimated activation-associated opportunities** with defensible denominators, separate ambiguous and unavailable-data counts. Do not use unexplained `COMPLIANCE 97%` cards.

## 5. Simulation design and character motion

The simulator is independent of the Three.js renderer. Scenario steps use an authoritative clock and typed actions `MOVE_STAFF`, `TAP_RFID`, `OBSERVE_BLE`, `TRIGGER_PROXIMITY`, `START_CARE`, `END_CARE`, `ACTIVATE_DISPENSER`, `CHECKPOINT`, `WIFI_DOWN`, `WIFI_UP`, `FAULT_DEVICE`, `RECOVER_DEVICE`, `AUTHORIZE_OVERRIDE`. Renderer subscribes to state; backend ingestion handles scenarios just like hardware observations. Don't mutate data directly in React event handlers beyond sending commands to backend. Characters must visibly walk/tap/press/rub hands with smooth, short, believable clips; patients remain still except modest breathing; visitors move through permitted pathways. Scenario progress bar, playback speed, step highlight and rule trace stay in separate docked UI regions.

Use 4 General Ward beds, 3 ICU zones as initial seeded configuration. Administrator can add/remove zone definitions without changing code. Maintain same character/equipment identity across modules and exploded viewers.

## 6. Phased implementation order

Follow `docs/DELIVERY_PLAN.md`, but start code immediately. Vertical slices:

1. Bootstrap monorepo, persistent DB migrations, seeding, nav shell, role demo accounts, application source labels.
2. Build cutaway world, ward focus navigation, equipment selection and smooth character animation paths.
3. Implement immutable ingestion, RFID next-bed logic, ICU BLE+checkpoint logic, ambiguity, faults, overrides.
4. Wire scenarios to backend events, scene animations and live event tables.
5. Build analytics, alert center and validation from real data.
6. Build **both** hardware exploded viewers using reusable device metadata, proper assembly kinematics, label no-overlap QA and signal-flow animations.
7. Implement eight-step shared station, browser webcam/local hand landmarks, voice/text and uncertainty.
8. Finish admin, security, exports, responsive/visual QA, E2E tests and accessible UX.

**Do not postpone hardware visualizer to an empty placeholder.** Establish the two actual 3D assemblies before polish phase.

## 7. Source documents and precedence

Read all docs and the new `Complete_Smart_Hand_Hygiene_System_PRD.docx`, especially its sections: §6 Information Architecture, §7 General Ward, §8 ICU, §9 Shared Station, §10 Checkpoint Rules, §11 Functional Requirements FR-001..FR-026, §12 Audit Log, §13 Database, §15 Hardware, §17 Nonfunctional, §20 Simulation Test Plan, §21 Acceptance. Source-specific differences are recorded in `docs/PRD_ALIGNMENT.md`. Earlier concept documents must not override the integrated PRD on **three ICU zones** or **eight-step sequence**. The added exploded viewers and cutaway UI are user-requested design extensions.

## 8. Verification / non-negotiable tests

Create unit, integration and Playwright tests. At least verify: next-bed pending event persists and alerts; new visit still opens; same-staff correlation; wrong/revoked RFID; unknown physical presence not inferred; BLE adjacency uncertainty, dropout hysteresis, incidental pass; two staff/one activation ambiguity; data gap suppresses false accusation; emergency override RBAC+reason; alert acknowledgement does not mark hygiene completed; linked append-only audit with timestamps and policy version; eight-step protocol and unable-to-assess; simulated/hardware provenance; restart/refresh persistence; dashboard recomputation; offline replay without duplicates; 3 ICU zones configuration; both exploded views assemble exactly and part selection works; keyboard and layout QA at specified viewport widths; no text collisions or clipped labels.

Target the integrated PRD's controlled-trial criteria (**19 of 20 scans and 19 of 20 dispenser detections**) only with measured controlled trials; do not assert this has been achieved without running the test setup. Validation Lab must separate manually observed ground truth from predictions and show `NOT YET MEASURED` until measurements exist.

## 9. Completion criteria and reporting

When complete, users can: open home selector → explore General Ward 3D → tap virtual RFID badge → create visit → record or skip dispenser event → scan next bed → see alert/audit and dashboard update → explore ICU 3D → trigger BLE/care-checkpoint reminder → inspect confidence and ambiguous visit → open exploded General kit and ICU kit → move explosion slider and inspect electrical/function mapping → run eight-step shared station → validate scenarios and export an audited report.

Commands must install, seed, start, build and test using locally available tools without mandatory paid API keys. Keep `TASKS.md` updated with status and blockers. Run lint, typecheck, unit/integration, Playwright, and final UI screenshots to confirm text, controls and hardware viewers do not overlap. Never label incomplete code 'fully functional'; report actual test results and unfinished capabilities accurately.

**START BUILDING NOW.**
