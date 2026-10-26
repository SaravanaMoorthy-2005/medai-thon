# Development plan and scope priorities

Time-box assumption: college hackathon, ~50 hours, free/open-source tools, modern student laptop with RTX 5050-class GPU (8 GB VRAM) and 32 GB RAM. These are **planning allocations**, not promised completion times.

| Stage | Indicative hours | Minimum proof before proceeding |
|---|---:|---|
| 1. Shell, schemas, 4+3 bed seed, event ingestion | 7 | App boots, DB persists, roles and source labels |
| 2. 3D hospital world, cutaway, characters, selection | 11 | Ward/bed focus, device click, stable models |
| 3. General RFID & ICU BLE backend rules | 10 | Normal/missing/ambiguous/fault tests run |
| 4. Scenario engine, alerts and analytics | 8 | One scenario updates 3D/backend/dashboard end-to-end |
| 5. Two hardware exploded 3D assemblies | 6 | Both tabs, slider, part inspector, signal modes |
| 6. Technique station, validation & privacy | 5 | Eight steps, camera fallback, ground-truth calculation |
| 7. End-to-end QA and presentation | 3 | Browser visuals + tests + demo tour |
| **Total** | **50** | **Functioning demonstrable research prototype** |

## Implementation strategy

Avoid parallel disconnected demos. Build an end-to-end thin slice first: `RFID tap -> server event -> pending visit -> dispenser or missing -> audit -> dashboard -> 3D indicator`. Then implement BLE and other scenarios on same infrastructure. Hardware explorer uses shared device metadata and dispatches demo actions through scenario ingestion. If full vision-based technique scoring isn't reliable, provide fully working guided station and explicit `UNABLE_TO_ASSESS`, not a fabricated accuracy result.

## Priority safety fallback

If schedule pressure arises, preserve the 4+3 ward environment, correct rules, event persistence, live dashboard, alerts, both hardware exploded viewers and acceptance tests. Reduce ornamental 3D complexity and advanced character animation before reducing data integrity. Ensure no page claims a feature is measured/validated if not.

## Final demo script (~4 minutes)

1. Home: open General Ward; blue RFID area and 4 beds visible.
2. Select D01 and tap GW-B01; open inspect log; skip dispenser, scan GW-B02; alert + audit while new visit proceeds.
3. Add N01 beside doctor; one dispenser event -> NEEDS_REVIEW; visitors clearly separate.
4. Switch ICU; three teal BLE zones; show tag estimates, then incidental passing near other zone with no false claim.
5. Trigger pre-contact reminder and then activate dispenser to record supported evidence.
6. Open new Hardware Explorer General tab; explode ESP32, RC522, switch, LED, buzzer and housing; visually follow SPI/GPIO/Wi-Fi.
7. ICU tab; explode BLE node; select battery-powered wearable; explain wireless BLE advertisements vs wired dispenser GPIO. Show 3 installed nodes and overlap uncertainty.
8. Shared station: eight-step guidance; no webcam fallback and uncertain status.
9. Dashboard: filters, event counts, device fault, validation report, meaningful limitations.

## Do-not-forget changes

- Three initial ICU zones, not two.
- Eight protocol steps configurable, clinical content pending hospital approval.
- IT/Biomedical and Auditor roles.
- Alert acknowledgement != event completion.
- Event device timestamps plus server receipt timestamps.
- Two exploded hardware viewers are a new user-requested engineering visualization.
