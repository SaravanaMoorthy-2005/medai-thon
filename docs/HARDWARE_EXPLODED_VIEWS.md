# Two Interactive Hardware Exploded Views — Build Specification

## Source, goal, and limits

User-requested **new Module 12**, added to the integrated PRD's hardware list (§15, page 7). Create **two separate, genuinely interactive WebGL assemblies** with smooth animation and accurate functional interpretation. They are engineering explainers for proposed prototypes, **not validated electrical fabrication drawings**. Component brand/model and exact PCB wiring remain configurable/open until real procurement. Link part IDs to the same device configuration used in both wards and dashboard.

Use a clear, premium museum-quality 3D product demonstrator: assembled physical kit, inspectable internal parts, translucent enclosure shell, measured-ish physical scale, tidy material finish, quiet accent colors (GW blue / ICU teal), unambiguous signal-path color legend. Avoid exploded piles of unrelated boards and art-gallery floating cards. All long text belongs in docked HTML lists/inspector; never overlay component descriptions atop the geometry.

## A. General Ward RFID Bedside Kit (tab: `GENERAL WARD / RFID`)

### Physical elements to model

| Part key | Element | Location/relationship | Function | Demonstrate accurately |
|---|---|---|---|---|
| GW-01 | Protected ABS/plastic enclosure, lid and standoffs | Bed-entry wall or nearby safe mount | Houses control electronics | Low-voltage, splash-safe **in design intent**, no invented IP rating |
| GW-02 | ESP32 Wi-Fi development board | Inside enclosure | Collect local inputs, timestamp/send Wi-Fi events, local buffering | ESP32 is the controller, not the RFID reader |
| GW-03 | MFRC522/RC522 RFID reader with antenna | Separate near bed-entry tap point | Read compatible registered badge UID deliberately tapped nearby | Low-range badge scan, not hands-free person detection |
| GW-04 | RFID staff badge/card | Detachable object carried by nurse/doctor | Identity token mapped server-side | Never hard-wire the badge into the device |
| GW-05 | Pump-style dispenser enclosure | Beside bed | Manual sanitizer pump | Never claim sensor proves product delivery |
| GW-06 | Dispenser microswitch or compatible sensor | Under/within dispenser actuation path | Detect lever/pump activation transition | Mechanical sensor placement diagram is illustrative |
| GW-07 | Indicator LED + current-limiting support | Near dispenser/reader | Prompt/status indicator | Logical indication, adequate circuit protection |
| GW-08 | Active buzzer + suitable driver if necessary | Enclosed near zone/dispenser | Audible reminder | GPIO cannot be presumed to drive arbitrary high-current buzzer directly |
| GW-09 | Power input/cable/board protection | Appropriate low-voltage entry | Supply controller and peripherals | ESP32 logic 3.3V; dev-board USB input may accept 5V depending on specific board; don't connect 5V GPIO logic directly |
| GW-10 | Mounting bracket, cable glands/connectors | Safe wall/dispenser locations | Realistic assembly | No exposed wiring near sanitizer fluid |
| GW-11 | Optional IR/proximity module | Separately designated zone | Extra presence/workflow evidence | Optional, not mandated per bed by integrated PRD; DOES NOT identify person |
| GW-12 | Wi-Fi router/network icon | External to bedside assembly | Forward events to backend | Dashed wireless link, not a copper wire from device to cloud |

### Signal graph (visual and metadata)

`Staff badge --[short-range RFID tap]--> RC522 --[SPI DATA, 3.3V-rated module]--> ESP32`

`Dispenser pump --[mechanical actuation]--> microswitch --[digital GPIO INPUT]--> ESP32`

`ESP32 --[output via suitable interface/driver]--> LED and buzzer`

`ESP32 --[Wi-Fi, DASHED radio link]--> router/API --> backend --> visit/opportunity matching --> dashboard`

`Optional IR --[digital/analog input depending on module]--> ESP32`

**Do not display exact SPI pin numbers as authoritative.** When a user selects 'Wiring details', show interface-level connections and mark board-specific pinout as **PENDING HARDWARE VERIFICATION**. Indicate shared grounds/regulated supply conceptually but do not present an unverified production electrical schematic.

### Demo interaction: RFID walkthrough

1. Assemble rig. Staff badge hovers separately in nurse hand.
2. User clicks `SCAN BADGE`; animate badge move to reader, reader momentary indicator, an RFID SCAN event typed payload and server receipt.
3. UI records an access request, opens visit/checkpoint.
4. User clicks `PRESS DISPENSER`; pump moves a few mm, switch lever visibly depresses, a clear yellow pulse follows **GPIO sensor input** path to ESP32, wireless dashed packets animate toward router, backend event appears.
5. User can `SKIP` and navigate nurse to next bed to generate a configured missing-event reminder.
6. Selected buzzer briefly indicates state; preserve no-block-care policy.

## B. ICU BLE Bed-Zone Monitoring Kit (tab: `ICU / BLE`)

| Part key | Element | Location/relationship | Function | Demonstrate accurately |
|---|---|---|---|---|
| ICU-01 | Safe node enclosure with lid/standoffs | Appropriately mounted near ICU bed zone | Protect electronics | No invasive patient monitor integration |
| ICU-02 | ESP32 BLE + Wi-Fi controller/receiver | Enclosure PCB/board | Observe BLE adverts, collect dispenser inputs, report over Wi-Fi | Built-in BLE receiver capability — external BLE receiver module **not compulsory** |
| ICU-03 | Separate BLE staff wearable/tag | Doctor/nurse clothing | Periodic ID advertisement | Independently battery-powered peripheral, **not wired** to ESP32 |
| ICU-04 | Optional tag battery detail | Within separate wearable | Powers BLE tag | Don't invent exact lifetime or battery monitoring if tag lacks it |
| ICU-05 | Bedside dispenser + microswitch/sensor | Beside ICU bed | Records dispenser actuation | Cannot prove correct hand rubbing |
| ICU-06 | LED and active buzzer + driver | Near node/dispenser | Local prompt | Apply configurable cooldown/volume |
| ICU-07 | Supply input, protected wiring, connectors | Appropriate safe area | Power receiver and attached sensors | No direct hazardous mains exposure or speculative rated certifications |
| ICU-08 | Optional secondary IR / doorway sensor | Nearby zone if configured | Independent workflow evidence | Optional, explicitly labeled; cannot identify doctor |
| ICU-09 | Wi-Fi router and backend gateway | External | Receives event stream | Dashed Wi-Fi/radio network line |
| ICU-10 | Neighboring BLE nodes (ghost copies) | 3 physical ICU zone locations | Show overlap/interference | Real RSSI uncertain; cannot draw exact closed tracking radius |

### Signal graph

`Staff BLE tag --[BLE advertisements, DASHED]--> ESP32 BLE scanner`

`Microswitch --[GPIO input]--> ESP32`

`ESP32 --[GPIO/driver]--> local buzzer + LED`

`ESP32 --[Wi-Fi, DASHED]--> router --> backend BLE filtering/hysteresis/opportunity engine`

`Neighbor BLE receiver observations --[separate observation streams]--> backend zone confidence/ambiguity evaluation`

Display a soft, explicitly **approximate** BLE signal cloud. Avoid laser beams, RFID tap reader in ICU, hard fixed geofence borders, exact room-position claims, and wired lines between BLE staff tag and receiver.

### Demo interaction: BLE walkthrough

1. Doctor wears a separate tag and approaches ICU-B01.
2. `SIMULATE TAG OBSERVATIONS` emits evolving RSSI samples at ICU receiver; neighboring B02/B03 can receive weaker readings.
3. `INSPECT ZONE EVIDENCE` shows filtering, persistence and confidence; chart corresponds to actual simulator samples.
4. `START CARE WORKFLOW` establishes a configured pre-contact checkpoint (do not infer from BLE alone).
5. `ACTIVATE DISPENSER` sends GPIO activation to ESP32, Wi-Fi to backend, supported visit association.
6. `SKIP DISPENSER` triggers controlled reminder at checkpoint; brief LED/buzzer pulse.
7. `SIMULATE OVERLAP/DROPOUT` shows uncertainty and no fabricated event association; optional `SHOW THREE ZONES` zooms to three installed receiver nodes.

## Explosion geometry and cinematic motion

Implement parts as **local transforms** relative to a single assembly root; define assembled world matrices, then interpolate along collision-free prescribed explode vectors with easing. Use smooth 450–1000ms transitions for typical operation (or a user-controlled slider), lightweight spring physics, no random unconstrained float. Select part should permit isolate/highlight without permanently breaking assembly. Use 0–100% progress slider and deterministic reassembly returning parts to exact original transforms.

Controls: `Explode`, `Assemble`, progress slider, `Play / Pause`, `Orbit`, `Reset camera`, `Top / Three-quarter / Side / Inside`, `Select part`, `Isolate`, `Show enclosure`, `Ghost enclosure`, `Show connections`, `Signals`, `Demo action`, `Fullscreen`.

Smooth camera: focus to bounding box of selected part with predictable easing. Prevent clipping of separated parts; expand camera bounds to encompass maximum explosion. Keep a **single orbit controller** and stable interaction states. Reduced motion mode disables automatic spins and snap animates to final positions.

### State wiring for animation

- `activeKit: 'GENERAL' | 'ICU'`
- `explosionProgress: number [0,1]`
- `selectedPartId: string | null`
- `isolatedPartId: string | null`
- `showEnclosure: 'solid'|'ghost'|'hidden'`
- `connectionMode: 'none'|'power'|'wired'|'radio'|'all'`
- `signalWalkthroughStep: integer`
- `motionPreference: 'normal'|'reduced'`

Part schema: `partId`, `kitId`, `name`, `role`, `isOptional`, `mount`, `relativeScale`, `assembledTransform`, `explodedOffset`, `connectionIds`, `deviceType`, `relatedPRDRequirement`, `limitation`, `inspectionNotes`. Reuse it in scene object metadata and device registry where it makes sense.

## Non-overlap labeling / visual engineering specification

**Desktop grid:** 240px part list | flex-width WebGL viewport | 340px selected-part inspector. Top tabs in a separate header row; bottom toolbar in a separate reserved row. Do NOT draw part descriptions floating over components. Numbered thin leader lines may connect parts to subtle edge anchors, with maximum 5 visible and high-priority selected part winning collisions. Billboard markers must use projected camera coordinates, avoid offscreen anchors, maintain minimum 10px label spacing and hide behind occluding geometry.

**Mobile/tablet:** component list and inspector as accordion beneath the canvas; keep viewer ~55vh and one control row scrolling horizontally if needed; no overlapping view controls/labels. Ensure all parts accessible through semantic component list even when 3D raycasting is not usable.

### Hardware exploded-view acceptance tests

1. Selecting GENERAL shows RC522+badge, no ICU BLE scanner disguised as RFID.
2. Selecting ICU shows ESP32 BLE node + separate BLE wearable; no physical wire joining tag and receiver.
3. Opening/closing assembly animates smoothly and returns parts to their original transforms (tolerance test).
4. Slider at 0 is assembled; at 1 all internal elements are clearly separated.
5. Part clicked in model highlights same item in component list and populates correct function/connection notes.
6. `Connections` distinguishes SPI/GPIO/wireless/power and does not invent a final pin diagram.
7. `Run RFID` and `Run BLE` call typed simulator events that update the shared backend, not merely decorative animations.
8. Three-zone ICU demo shows all three configured nodes and an adjacent-zone overlap case.
9. Capture screenshots at 1366×768, 1440×900, 1920×1080, 1280×800, 375×812 with slider 0/50/100; verify zero text collisions.
10. Viewer cleans its GPU resources when switching assemblies.

## Design credibility / documentation

Maintain a component inventory linked to PRD §15, show which parts are optional and which are logically shared. Include short readable engineering notes such as “RC522 supports a short-range intentional tap,” “ESP32 acts as BLE scanner,” “Sensor detects dispenser activation only,” and “5V supply vs 3.3V logic depends on board design.” No invented measured range, accuracy, power consumption, medical approval or fabricated prices. Source details for ESP32 power guidance: https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32/schematic-checklist.html
