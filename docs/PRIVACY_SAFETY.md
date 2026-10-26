# Privacy, safety, authorization and limitations

Integrated PRD §4 and §§17–18 form baseline safeguards. HYGIENE OS is an academic research prototype, not a certified medical device. Don't imply proven infection prevention or clinical hand-hygiene compliance.

## Data minimization

- Default aggregate dashboards expose pseudonymous staff references, bed/zone ID and event status, not patient names.
- Staff badge/tag credentials are mapped server-side; no patient data is stored on wearable/card.
- Distinguish `SIMULATED` / `HARDWARE` / `MANUAL` provenance.
- One shared camera station with foreground informed use and local hand processing; no patient-bed cameras and no raw video saved by default.
- Audit every export and sensitive record access, with configurable retention and restricted scope.

## Roles

1. Doctor / Nurse: staff interaction, own prompts, shared station; cannot silently edit source audit or identities.
2. Ward Supervisor: review/acknowledge/resolve authorized ward alerts with reason and audit.
3. Infection-Prevention Team: approved ward-wide/aggregate analysis and authorized reports only.
4. Biomedical / IT Support: view/test device status and diagnose technical faults; configuration actions audited.
5. Administrator: configure hospital, staff credentials, policies and devices; least-privilege enforcement.
6. Auditor: read-only approved audit/report access; cannot mutate source records.

Local demo may offer clearly labeled role switching, but backend-sensitive actions must still apply authorization rules.

## Medical safety

- Never lock/open physical access based on software hygiene status. All status language is advisory.
- Configure pre-contact checkpoints as appropriate; retrospective next-bed checks are not substitute for before-contact hygiene.
- RFID scan proves only badge tap. BLE proves only estimated signal presence. Dispenser activation proves only sensor-observed actuation. Hand motion estimate cannot prove coverage or sanitizer efficacy.
- Multi-staff ambiguity and signal overlap require `NEEDS_REVIEW`; no automatic random/collective attribution.
- Sensor disconnection/network loss require fault/data gap and manual fallback; do not equate absence of data to staff failure.
- Alerts have duration/cooldown/configured escalation to avoid alarm fatigue.
- Emergency care proceeds; overrides logged with actor, role, reason, timestamp and linked record.

## Authorization & security

- Zod-validation or equivalent for all API payloads, signed/authenticated hardware senders and device ID allow-list for connected mode.
- HTTPS/TLS for deployed environments, secrets server-side, no credentials committed, restricted export scopes and audit.
- Avoid silently replacing original raw events; append linked corrections with old/new value and actor.
- Distinguish clinical/hospital policy settings from technical demo configuration; seek approval before real-world deployment.
