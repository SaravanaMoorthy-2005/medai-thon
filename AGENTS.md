# AGENTS.md — Instructions to Codex and other coding agents

## Mission
Build an authentic, premium, safe, **working** HYGIENE OS browser prototype. The 27 October 2026 integrated PRD is the authoritative clinical/workflow document; `CODEX_MASTER_PROMPT.md` is the engineering implementation brief; `docs/` provides detailed subsystem contracts. **Do not stop at mockups, plans or landing pages.**

## First five steps
1. Read `CODEX_MASTER_PROMPT.md`, then all docs in `/docs` and `TASKS.md`.
2. Inspect the repository, tools, existing files and attached PRD. Record deviations in `TASKS.md`.
3. Establish zero-credential local install/build/test commands and initial SQLite schema.
4. Build one truly end-to-end RFID path and one BLE path with persistent, inspectable evidence; expand to all 12 sections.
5. Run tests and visually inspect 3D/editor/dashboard at 1366×768, 1440×900 and 1920×1080; fix text overlaps.

## Immutable requirements
- At least 2 configurable General Ward beds, default demo **4**; ICU exactly **3 initial bed zones**, configurable.
- One shared, configurable **8-step** guidance station; 8-step medical content requires local hospital approval.
- General Ward checkpoint: same staff's next RFID bed scan evaluates preceding visit before opening the next visit.
- ICU BLE gives uncertain proximity, not proven patient contact; pre-contact prompt requires a supporting configurable checkpoint.
- Never conflate dispenser pump activation with proven hand-hygiene quality.
- Sensor fault/outage => `DEVICE_FAULT`/`DATA_GAP`, not staff noncompliance.
- Multiple plausible staff => `NEEDS_REVIEW`, never automatic assignment to everyone.
- Never block emergency care. Alert acknowledgment != hygiene completion. Authorized exceptions need audit.
- Separate source observations and interpreted status changes, with event ID, device+receipt time and append-only linked audit.
- Two functional, smooth, separate **3D hardware exploded views** with correct component placement, connection types, and externally docked labels. No fabricated finalized wiring diagram.
- No continuous bedside video. Camera only at one shared station, no raw recording by default.
- Data-driven charts and scenario states; distinguish simulation from connected hardware.

## Working style
- Do not ask obvious questions; choose documented defaults and proceed.
- Preserve TypeScript safety. Prefer pure, tested domain logic over UI-only side effects.
- Implement in small testable vertical slices, committing or saving after each major milestone.
- Reuse equipment metadata between digital twin, hardware explorer and device admin to avoid drift.
- Avoid placeholders, inert buttons, fake counts, meaningless completion messages.
- Use existing dependency versions compatible with the runtime. If internet is not available, keep a no-external-service fallback.
- 3D model assets must have usable licenses and attributions. Prefer authored primitives if uncertain.
- After each phase, update `TASKS.md` with checked items, test commands and known limitations.
- Never silently weaken or remove an acceptance criterion to make a test pass.

## Definition of done
- Real backend event ingestion and persistence.
- Reproducible scenario replay and linked evidence traces.
- Functional 3D ward view and two hardware assemblies, not image substitutes.
- Source-derived dashboard, tested filtering and refresh consistency.
- Guidance station with properly qualified outcomes and camera fallback.
- Correct guardrails, audit logs and role permissions.
- Lint, typecheck, unit/integration/E2E, screenshot overlap QA recorded.
