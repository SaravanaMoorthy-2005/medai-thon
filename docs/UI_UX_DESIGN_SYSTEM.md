# Premium UI/UX and absolute non-overlap contract

## Aesthetic

Original product identity: **HYGIENE OS**, elegant medical operations dashboard blended with a deliberately crafted architectural cutaway. Neutral clinical light theme, clear spatial hierarchy, compact density, generous whitespace where needed. Colors: `#F6F8F9` background, `#FFFFFF` surface, `#14283B` navy, `#182B3B` text, `#697D8B` muted, `#397EB3` RFID/General, `#168C82` ICU/BLE, `#D69332` uncertainty, `#C04B4B` critical. No loud gradients/glass/futuristic glow/giant rounded cards.

## Layout constraints

- Sidebar expanded 240px, collapsed 68px; topbar 64px; main min-width 0; right inspector 320–380px with resize/collapse; timeline bottom 160–220px when open.
- Inside a 3D module: center canvas takes available width, inspector uses sibling column, **never positioned on top of the 3D view**. On <1200px, inspector becomes a bottom sheet or collapsible overlay with a backdrop and scroll control, never permanent covering text.
- Main header max two text lines, section title generally 22–26px, body 14–16px, captions 11–12px. Use consistent 8px grid and 12/16px row gaps.
- Right inspector has sticky title, independent scrollable data body, static controls at bottom when required.
- Tables support horizontal scrolling only within table wrapper; never induce whole-page overflow.
- Charts maintain aspect ratio and axis text; tick abbreviation, tooltip flip and dynamic margins, not superimposed labels.

## Mandatory text-vs-3D label rule

**Do not put every equipment description over the 3D scene.** Canonical labels and long text live in docked columns. Scene shows short numeric markers (e.g. `01`, `02`, `03`) only for selected/hovered high-priority components. Projected HTML markers must be bounded to canvas, avoid control safe zones and disappear if occluded or camera-facing test fails.

If using many point labels: compute screen-space rectangles and apply stable priority-based collision filtering. Maximum concurrent visible anchors: 5 desktop / 2 narrow. Fall back to selected-item marker only at tight zoom. Hover tooltips flip if edge-constrained. Don't let toast notifications stack over the controls or scene. Prefer CSS grid reserved rows.

## Hardware explorer composition

Desktop: header with General/ICU segmented tabs; left-side component list 240px; center 3D assembly with large whitespace; right-side selected-component inspector 320px; bottom toolbar (explode slider 0–100%, Play/Pause, Assemble, Isolate, Connections, Rotate, Reset). Use a single clear illustration at any moment, not two competing exploded diagrams stacked. On <=1024px, move lists to accordion below canvas; keep controls usable.

Component list entries use aligned numerical index, component name, tiny type label, and status. Selection syncs list + model + technical description. Short leader lines only; no giant floating labels.

## Accessibility and motion

Respect `prefers-reduced-motion`; offer animated/instant camera modes and animation pause. Give keyboard focus and semantic button labels; F6/Tab navigation should reach hardware components via accessible list even when raycast model isn't keyboard accessible. Distinguish status through both text and color; avoid excessive audio reminders. Provide camera/sensor fallback and busy/error notices.

## Visual QA acceptance

Use Playwright screenshots or equivalent at: 1366×768; 1440×900; 1920×1080; 1280×800; 375×812; plus desktop browser at 125% zoom. Cover 3D ward overview with inspector open, dense multi-staff scenario, hardware exploded at 100%, hardware at assembled 0%, oversized alert text, validation matrix, charts with long labels, long staff/device IDs, dark focus outlines. Tests assert no page-level horizontal overflow, no clipped menu, no inspector/canvas intersection and no overlapping anchor rectangles. Manually inspect final screenshots, not only DOM assertions.
