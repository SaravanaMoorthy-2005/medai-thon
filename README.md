# HYGIENE OS v2.0 — Hospital digital twin

A working local research prototype with 12 navigable modules, an original architectural 3D hospital, persistent RFID/BLE event workflows, two exploded hardware assemblies, and shared eight-step guidance. It remains a controlled simulation; production hardware, clinical validation and several advanced acceptance items are unfinished.

## Run

Node.js 24 and npm are required. No cloud keys or accounts.

```powershell
npm ci
npm run seed
npm run dev
```

Open http://127.0.0.1:5173 . SQLite evidence persists in `data/hygiene.sqlite`.

See [implementation and limitations](IMPLEMENTATION.md), [verified progress](TASKS.md), and [third-party notices](THIRD_PARTY_NOTICES.md). `npm run build` followed by `npm start` serves the built application on port 3001.

## What is in this package?

- `CODEX_MASTER_PROMPT.md` — paste directly into Codex; main build instruction.
- `AGENTS.md` — repository-level rules for Codex.
- `TASKS.md` — implementation checklist / progress journal.
- `docs/PRD_ALIGNMENT.md` — exact integrated-PRD requirements, corrections vs older master prompt.
- `docs/PRODUCT_AND_NAVIGATION.md` — 12 functional modules and key interactions.
- `docs/UI_UX_DESIGN_SYSTEM.md` — premium visual specification and no-overlap requirements.
- `docs/THREE_D_WORLD.md` — 3D cutaway, scene composition, characters and camera.
- `docs/HARDWARE_EXPLODED_VIEWS.md` — both fully interactive hardware assemblies and signal paths.
- `docs/RULES_AND_SCENARIOS.md` — ward rules, confidence, deterministic scenarios.
- `docs/DATA_API_REALTIME.md` — database, event contracts, APIs, audit and synchronization.
- `docs/TECHNIQUE_STATION.md` — shared eight-step guidance and privacy.
- `docs/TEST_AND_ACCEPTANCE.md` — validation and automated acceptance gates.
- `docs/DELIVERY_PLAN.md` — implementation phases and demo storyline.
- `docs/PRIVACY_SAFETY.md` — constraints and roles.
- `.env.example` — optional configuration sample (no secrets).

## Specifications and continued development

The integrated PRD is retained under `references/`. Read `AGENTS.md`, `CODEX_MASTER_PROMPT.md`, all subsystem documents, and `TASKS.md` before extending the implementation. Preserve working source evidence and use the tests as regression checks; do not treat all original acceptance criteria as completed.

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Browser tests use installed Chrome with synthetic camera input and an isolated test database. They do not activate a physical camera. See `IMPLEMENTATION.md` for architecture, ports, role behavior, and demo instructions.

## Non-negotiable design decision

The integrated PRD establishes **General Ward RFID scanning at each bed and next-bed retrospective checks**, **three ICU BLE-monitored bed zones**, and **one shared eight-step technique station**. Added **3D hardware explorer** is a user-requested new module. Do not guess an exact final hospital protocol, actual pinout or clinical performance number.

## Reference and credit

3D interaction inspiration: https://imsemoo.github.io/cutaway/ and https://github.com/imsemoo/cutaway (MIT license; use interaction ideas, not unsanctioned copied assets). MediaPipe web Hand Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js . ESP32 hardware design reference: https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32/schematic-checklist.html
