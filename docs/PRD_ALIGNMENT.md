# Integrated PRD alignment and change log (source: 27 October 2026, 10 pages)

This document distinguishes **PRD requirements** from **user-requested enhancements** and **implementation choices**. Source is `Complete_Smart_Hand_Hygiene_System_PRD.docx`, version 1.0. Page references below refer to that DOCX's ten printed pages.

| Requirement | Source | Concrete build implication | Status |
|---|---|---|---|
| One home with General / ICU selectors | p1 §3; p2 §6 | Two primary ward cards, navigable | PRD |
| General Ward badge tap at **each** bed | p3 §7 | One RFID reader per configured bed entry | PRD |
| Same-staff **next bed-entry scan** reviews old pending event before new visit | p3 §7; p4 §10; p5 FR-010 | Serialized per-staff visit workflow, previous event preserved | PRD |
| Earlier pre-contact reminders when hospital policy requires | p3 §7 clinical timing note | Explicit checkpoint, not solely next-bed logic | PRD |
| ICU **three configured BLE bed zones** at initial deployment | p1 §1; p3–4 §8; p9 §21 | Default 3 ICU zones; previously proposed 2 is outdated | PRD |
| BLE overlap, adjacent zone and RSSI instability | p4 §8; p9 §20 | Confidence, hysteresis, uncertain attribution | PRD |
| Dispenser activation not proof of quality | p1 §1; p2 §4; p8 §18 | Data labels ACTIVATION_RECORDED, not COMPLIANT | PRD |
| One shared station, **eight configured technique steps** | p4 §9 | Configurable protocol version, voice+screen, webcam estimate | PRD |
| Approved protocol details are **not fully specified** | p4 §9, p10 §24 | Supply editable DEMO placeholder steps; require hospital approval before clinical use | Open decision |
| Separate device/received timestamps + unique IDs | p5 §11; p6 §12; p8 §17 | Dual timestamps, idempotency and time-drift monitoring | PRD |
| Append-only audit, correction not overwrite | p6 §12; p8 §18 | Raw observation store + linked state-change audit | PRD |
| Alarm acknowledgement != completion | p4 §10; p5 FR-015 | Separate alert and hygiene opportunity states | PRD |
| Emergency access never physically blocked | p1 §1; p2 §4; p4 §10 | Software-only advisory states + audited override | PRD |
| Include IT/Biomedical role and Auditor role | p2 §5 | Six role categories with backend RBAC | PRD |
| At least 2 configurable General beds + 3 ICU zones | p9 §21 | Demo 4 GW beds and 3 ICU zones; configuration-driven | PRD + demo default |
| Controlled RFID/dispenser detection 19 of 20 | p9 §21 | Future test target, never pretend measured before trials | PRD |
| Two **animated exploded-view hardware setups** | Not in PRD; explicit user requirement | Add **module 12** with 2 unique assemblies | Enhancement |
| Premium interactive cutaway resembling reference interaction | User reference, not PRD | 3D hospital with original design, efficient camera and inspectors | Enhancement |
| Strict text alignment and no label collision | User requirement, not PRD | Docked labels, constrained overlays, screenshot QA | Enhancement |
| Local SQLite zero-credential dev | p8 §16 suggests PostgreSQL | Engineering choice; portable migrations for PostgreSQL later | Engineering choice |

## Conflicts resolved from previous Codex instructions

1. **Old**: ICU two beds. **New authoritative**: three initial BLE zones (`ICU-B01`, `ICU-B02`, `ICU-B03`). Do not silently use two.
2. **Old**: arbitrary hand-rubbing phases. **New authoritative**: eight configurable hospital-approved steps; exact final protocol not supplied and must not be invented as clinical fact.
3. **Old**: perhaps 11 modules only. **New user enhancement**: keep the 11 workflow modules and add `12 Hardware Explorer` for two exploded views; shared station remains a single station.
4. **Old**: generic real-time charts. **New**: audit clock integrity, approval-sensitive roles, repeat-alert cooldown, unresolved reviews and device fault/data gap explicitly represented.
5. **Old**: ICU BLE tag alone triggers pre-contact hygiene violation. **New**: do not infer contact from proximity; use configured clinical checkpoint + separate workflow evidence.
6. **Old**: hardware kit assumed per-bed ESP32 with fixed wires. **New**: PRD allows an ESP32 per bed OR a shared wired arrangement. Implement both as selectable deployment models, initially depict representative per-bed kit, and show wiring diagrams as educational unvalidated concepts.

## Open decisions — expose via admin/configure rather than guessing

- Actual dispenser mechanism and microswitch/optical sensor mounting.
- ESP32 board model and specific pin map.
- ESP32-per-bed vs shared-controller wiring plan.
- BLE receiver placements and calibrated signal thresholds.
- Exact hospital-approved hand-rubbing protocol and step wording.
- Alert volume, cooldown/escalation thresholds, who can resolve.
- Camera validation criteria, environment privacy approval.
- Retention period, deployment location and report export permissions.
- Whether physical access control would ever be independently authorized (OUT OF SCOPE).

## Traceable acceptance

Implement test IDs from `docs/TEST_AND_ACCEPTANCE.md` mapped to FR-001..FR-026. The application remains a simulated academic prototype until measured data and approvals are available.
