# Shared Camera-Guided Technique Station — eight-step contract

Integrated PRD §9 (page 4) requires ONE station serving both wards, with an **eight-step hospital-approved procedure**, on-screen/voice prompts, a dedicated station dispenser sensor and camera-estimated movements. The exact approved eight step names/order are **an open decision**. Implement an editable protocol configuration with exactly eight ordered slots and revision identifier, and clearly label unapproved demo placeholders. Do not pretend a generic sequence is a validated hospital-approved clinical protocol.

## Hardware / UX

- Station dispenser and unique activation sensor ID distinct from bedside device IDs.
- USB webcam aimed at hands only, not patient beds or identifiable faces; laptop or mini-PC processes frames; screen and speaker instruct.
- UI left column: ordered protocol steps and current status; center: camera view/hand landmarks; right: instructions + evidence quality; bottom row: start/pause/restart/save/mute.
- Start session by badge/authenticated session if supported; otherwise permit anonymous/local demonstration with uncertain staff association.
- Browser permissions, no-camera demo mode, webcam unavailable/low light/occluded hands handling.

## Data path

1. Open `TechniqueSession` with staff association confidence, station ID, protocol version and timestamp.
2. Station dispenser activation is a distinct `DispenserEvent` with station location mapping (not automatically added to any bedside visit).
3. For each approved configured step 1..8, present text+voice; track observable movements/time and confidence; persist derived `TechniqueStepResult` including `UNKNOWN` if poorly visible.
4. At completion store per-step results and session status `ASSESSMENT_COMPLETED`, `RETRY_RECOMMENDED` or `UNABLE_TO_ASSESS` with uncertainty reasons.
5. Broadcast session summary to appropriate ward dashboard if staff association is reliable and permissions allow.

## Computer vision

Use MediaPipe Hand Landmarker in browser (21 landmarks per hand) to estimate visibility, hands-present intervals and simple movement patterns. The model does **not** validate coverage of every hand surface or microbiological efficacy. Before clinical use, require expert labeled samples and review of any classifier. Store derived landmarks/step summary only if needed under retention policy; **do not store raw video by default**. Provide text alternatives to voice in noisy wards. Use user-specific start/stop; never activate camera continuously behind scenes.

## Test examples

- Eight editable ordered steps render and progress in order.
- Denied camera permission produces useful guided-only fallback.
- Hand landmarks unavailable -> `UNABLE_TO_ASSESS` rather than artificial pass.
- Session and separate station dispenser records include timestamps and source mode.
- Protocol version changes create audited configuration event and don't rewrite existing sessions.
