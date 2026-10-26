# Product map and functional navigation

## Primary experience

Landing page must offer **General Ward** and **ICU** as two large, clean navigable destinations. Above the fold show system health, live-source label and quick 3D overview, not a marketing hero page. App has 12 navigation destinations:

| # | Screen | Primary user action | Observable backend result |
|---|---|---|---|
| 01 | Command Center | Select ward/bed/alert | Navigation and filtered stored events |
| 02 | 3D Hospital | Focus, inspect, manipulate actor/device | Dispatch typed simulation command |
| 03 | General Ward | RFID tap, dispenser activation, next bed | Visit/checkpoint transition and audit |
| 04 | ICU | BLE observations, configured pre-contact/exit checkpoint | Estimated visit, reminder and audit |
| 05 | Opportunity Engine | Inspect raw evidence and rule trace | Read stored source/correlation records |
| 06 | Scenario Lab | Play/pause/replay/step | Deterministic scenario event stream |
| 07 | Analytics | Filter chart / drill down | Backend aggregate query |
| 08 | Alert Center | Acknowledge, review, escalate, resolve | Separate alert events and audit |
| 09 | Technique Station | Run camera/demo steps | Guidance session and results |
| 10 | Validation Lab | Compare observed ground truth vs engine output | Stored test run and computed metrics |
| 11 | Devices, Privacy & Administration | Configure, revoke, test, export | Guarded operation + audit log |
| 12 | Hardware Explorer | Explode/reassemble GW vs ICU kit | Client animation; optionally dispatch event demo through backend |

## Global persistence rules

Each page must read the authoritative event/visit records from the same backend. Keep query cache keyed by hospital/ward filters and source mode. Browser refresh must not erase server-side events. Do not show a KPI panel with independent invented counts.

## Universal app controls

- Data source pill: `SIMULATED LIVE`, `CONNECTED HARDWARE` or `OFFLINE DEMO`.
- Breadcrumb `Hospital / Ward / Bed` and context deep links.
- Staff identity available only when role permits; default analytics use pseudonymous IDs.
- Global ward/date/source filter and last-sync state.
- Scenario playback context follows user between scene, event log and analytics.
- Buttons have disabled, busy, error and success states; avoid invisible click targets.
- Each visually complex page has responsive list/2D fallback.

## Ward flow traceability

General Ward: RFID tap at Bed 1 -> event identity validation -> pending opportunity -> optional recorded dispenser activation -> next RFID tap at Bed 2 for same staff -> prior event evaluated -> warning if missing -> previous record retained -> Bed 2 visit still starts.

ICU: BLE tag observation -> filtered zone estimate -> supporting workflow or bed-space event -> opportunity checkpoint -> recorded activation or reminder -> exit (if configured) -> final recorded/uncertain state with devices in view.

## Guide tour

One-button demo: hospital cutaway → General normal → General missed next-bed → crowded ambiguous staff/visitor → ICU normal → ICU pre-contact reminder → incidental BLE filtered → ICU device fault → two hardware exploded views → eight-step station → dashboard → validation. Allow pause, skip and exit; tour exercises actual actions.
