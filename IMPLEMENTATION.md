# HYGIENE OS v2.0 implementation

## Run locally

Requires Node.js 24 (verified with 24.16.0) and npm. No accounts, cloud service, patient data, or API keys are required.

```powershell
npm ci
npm run db:migrate
npm run seed
npm run dev
```

Open http://127.0.0.1:5173. The Fastify API listens on 127.0.0.1:3001. Both bind to loopback deliberately. `npm run build` creates `dist/`; `npm start` serves the API and built app together on port 3001. Seed/migration are idempotent and preserve existing evidence. `HYGIENE_DB` selects a different SQLite database; default is `data/hygiene.sqlite`.

## Architecture

- `src/`: React, original CSS design system, Zustand snapshot store, Three.js / React Three Fiber and Drei, ECharts, local MediaPipe hand landmarks.
- `shared/`: Zod observation contracts, typed projections, declarative scenario catalog and hardware component inventory.
- `server/`: Fastify API, cookie-based local demo sessions, role gates, SQLite migration/seed, event interpretation and scenario clock.
- `tests/`: domain, API integration, browser workflows and viewport screenshots.
- `public/mediapipe/`: locally served WASM and official model. No video-upload endpoint exists. Font files are bundled by Vite.

The source `DeviceEvent` table contains immutable input payloads, event IDs, device and receipt clocks, source mode and deduplication keys. `Interpretation` is separate. Append-only `AuditLog` records linked transitions, policy version, actor, and reason. SQLite triggers reject source/audit updates and deletions. Changes and persistence are committed before WebSocket snapshot notification.

Projection entities have dedicated SQLite tables using typed JSON payloads. This initial local schema is deliberately simpler than a fully normalized production relational model. It has an explicit migration version, immutable evidence tables and indexes, but does not yet provide PostgreSQL migrations or all cross-entity foreign keys.

The WebSocket sends an initial full snapshot with a monotonic sequence. Clients reconnect, refresh the complete projection, and ignore older sequences. Simulator network outages store a durable software queue and replay original IDs. Real firmware buffering has not been tested or implemented.

## Working demonstration

1. **Command Center:** inspect source-derived counts, then open either ward or the digital twin.
2. **3D Hospital:** orbit, zoom, switch plan/list, select beds/devices, change ward focus, select an actor, or inspect the shared station. Mobile uses the same bed actions in a list.
3. **General Ward:** select D01, tap GW-B01, skip the dispenser, select GW-B02 and tap again. The earlier record becomes `EVENT_NOT_DETECTED`, an advisory alert appears, and the new visit remains open.
4. **ICU:** select ICU-B01, observe three tag samples, then trigger an explicit care checkpoint. A reminder requires the checkpoint, not proximity alone.
5. **Opportunity Engine:** inspect independent confidence dimensions, source records, policy version and linked audit history.
6. **Scenario Lab:** run, pause, step, resume, change speed or replay one of 21 scripted scenarios. Replay creates a new run ID and preserves earlier evidence. Separate runs have isolated matching scopes.
7. **Live Analytics:** filter by ward, bed, device, classification or device date. Charts and tables share the filtered evidence. Association denominators exclude and separately disclose ambiguity/data gaps.
8. **Alerts & Review:** provide a reason, acknowledge, investigate, escalate, resolve or record an authorized emergency exception. Acknowledgment never changes the opportunity result.
9. **Technique Station:** start an anonymous guided session, optionally enable the locally processed camera, or continue without it. Eight ordered records are saved. Unknown input yields `UNABLE_TO_ASSESS`; visible landmarks alone do not validate technique.
10. **Validation Lab:** compare independent scripted or manual truth with completed-run predictions. Reports show measured software comparisons; physical 19/20 trials remain `NOT YET MEASURED`.
11. **Devices & Admin:** switch to the explicitly labeled Administrator demo role to add/deactivate beds, enroll/revoke credentials or version the eight-step demo protocol. Six roles are checked by the server; auditors cannot mutate evidence.
12. **Hardware Explorer:** choose RFID or BLE, explode/reassemble, select/isolate parts, toggle enclosure/diagram/connections, use camera presets and turntable, inspect each connection, and run the corresponding backend scenario. ICU includes a three-node deployment illustration.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Browser tests use installed Google Chrome, isolated ports 5174/3002, an independent SQLite database per execution, and fake camera input. They never activate a physical camera. Browser screenshots are written to `test-results/qa/`; the final selected evidence is retained under `artifacts/qa/`. Physical camera accuracy, BLE calibration and hardware detection trials are not implied by these software tests.

## Deliberate prototype limits

- This is a local research simulation, not a production or clinically validated system. Hardware-source payloads are rejected rather than mislabeled as connected hardware. Device provisioning, firmware, signed messages, TLS deployment and production identity integration remain future work.
- Six local demo roles demonstrate backend authorization. Production ward/own-staff data scoping, session expiry and institutional identity integration remain incomplete.
- The 3D models are original authored primitives with articulated illustrative characters, not photorealistic scanned assets. Actor movement responds to accepted events; a collision-aware locomotion planner and frame-exact animation/event scheduling are not complete. Camera follow focuses on the actor's destination zone.
- The hardware assemblies explain proposed component relationships and interface classes. They are not fabrication drawings. Final board pinouts, electrical protection, enclosure ratings and clinical installation must be reviewed separately.
- The camera model loads and runs locally; synthetic-camera and permission-denied tests pass. No validated classifier for eight clinical movements is supplied. The unapproved demo protocol never returns a clinically verified success.
- Device health changes are explicit simulation commands. Real heartbeat timeout monitoring, measured availability, automatic escalation schedules and physical buzzer delivery are not complete.
- Retention preference is persisted but automatic deletion is disabled to preserve append-only evidence. Scope is pseudonymous simulation data only.
- Analytics supports source drill-down and ward CSV export. Shift/staff-scope filters, full availability/latency dashboards, and validation CSV exports remain incomplete.
- Run reset is provided as replay into a new ID, preserving old evidence. There is no destructive global reset or multi-minute guided-tour orchestrator.
- No FPS or clinical outcome benchmark is claimed. The complete original acceptance matrix is not yet closed; `TASKS.md` records partial gates honestly.

## Design and source credits

The original hospital and assemblies were authored for this application. Architectural cutaway navigation and docked inspection were inspired by [Cutaway](https://imsemoo.github.io/cutaway/) / [source](https://github.com/imsemoo/cutaway), whose repository lists MIT licensing. No Cutaway code, branding, model or texture was copied.

MediaPipe implementation follows the [official web guide](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js). Model capability and limitations are described in its [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf). ESP32 component notes use [Espressif's schematic checklist](https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32/schematic-checklist.html). These are reference sources, not a validated design for this installation.
