# Interactive 3D Hospital — world specification

## Spatial layout

Create original procedural/hybrid 3D hospital cutaway in local world coordinates. A north/south corridor joins two rooms: General Ward (four beds `GW-B01..GW-B04`) and ICU (three separated zones `ICU-B01..ICU-B03`), plus a single shared technique station near corridor. Provide a clean isometric camera preset and smooth orthographic/perspective transitions. Do not introduce extraneous floors or giant buildings that distract from the ward workflows. Wall masking/cutaways allow visibility with camera motion. Use a stable static world scene graph to avoid losing animation state on navigation.

## Interaction modes

- Hospital overview: both wards and shared station legible.
- General Ward focus: click each RFID reader and bedside dispenser; follow nurse, doctor, visitor.
- ICU focus: separate BLE zone estimates for all three beds, tag observation overlays, logical signal cloud only.
- Bed detail: focus selected bed and contextual event inspector.
- Device inspection: select real 3D sensor; side panel shows ID, connection, last observed status and actions.
- Character follow: deterministic path and animation, selectable activity timeline.
- Plan/list alternative: navigable for machines without WebGL.

## Characters and animation

Include two doctors, two nurses, patient figures for each bed, several visitor figures in shared/General area. Use licensed external low/medium-poly figures or authored stylized figures, always with credible anatomical scale and professional scrubs. Maintain character identity: D01/D02/N01/N02 and neutral V01/V02. Actors have waypoints (corridor -> entry -> bedside -> dispenser -> next bed) and finite-state action animations (idle/walk/badge tap/press pump/hand rub/care interaction). Interpolate motion with a single scenario clock; no independent animations that drift from backend events. Emergency actions prioritize care and never show physical access blocking.

## Realistic physical equipment

RC522 readers at each General bed-zone entry, not attached to patients. Bedside sanitizer pump linked to independent activation sensor. ESP32 enclosure safely wall-mounted or beneath a protected equipment surface. BLE receiver node near each ICU zone, staff wearable separate and battery-powered. Local buzzer/LED near dispenser. Camera/screen/speaker are ONLY at shared station. Use same reusable equipment meshes/IDs in both ward scene and exploded viewer.

## Camera and cutaway interaction

Fly-to Ward/Bed/Equipment using configurable bounding box; ease over ~600–1100ms with reduced-motion alternative. Always leave selected object unobscured by walls. Restore previous overview via breadcrumb/back. Clamp zoom, avoid floor penetration and camera jump when changing ward. Optional thumbnail locator/floor map; do not crowd scene with text markers.

## Visual detail and performance

Use consistent believable materials: matte antimicrobial-style painted surfaces, muted metal rails, diffused lighting, low-to-medium complexity monitors, neutral floor textures. No fake patient monitors showing clinical diagnosis; simple plausible decorative vitals, not actual medical decision support. Use instancing for repeated beds/dispensers, GLB texture optimization, dynamic draw-call budgets, lazy asset preload, Frustum culling, no shadows on every object, adaptive pixel ratio. Aim for visually smooth laptop playback and stable frame time; record actual measured FPS before stating performance.

## Narrative scenes

1. RFID doctor tap at GW-B01 → staff/bed record.
2. Same doctor arrives GW-B02 without matching prior activation → reminder + audit, visit continues.
3. Multiple staff and visitors around GW-B03 → ambiguous shared dispenser, no false assignment.
4. BLE doctor enters ICU-B01 → plausible estimated zone visit from stable observations.
5. Doctor passes outside ICU-B02 → incidental BLE observations, no false accusation.
6. ICU pre-contact checkpoint → reminder before activity if supporting workflow action and no activation.
7. Emergency → no blocking, authorized override.
8. Device loss → stale device indicator and data-gap state.
9. Hardware Explorer → select each reusable device and animate signal path.
10. Dashboard → all events visible with backend audit evidence.
