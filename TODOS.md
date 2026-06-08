# TODOS

## Backup / export (v1.1, P2)
- **What:** JSON export/import of MMKV state (workout history + equipment + rotation).
- **Why:** MMKV is the only copy of training history; a phone reset/reinstall wipes everything,
  and the coach's entire value depends on that history.
- **Context:** Premise 4 from the office-hours design named this "the one real risk." Deferred from
  v1 because history is near-zero now (low urgency, rising over time). Pulling it into v1 would delay
  the magic moment for a small risk.
- **Depends on:** nothing (additive). Note: `getLastLogFor` must sort by `completedAt` (not rely on
  array order) so an imported/reordered history stays correct.
- **Where to start:** serialize the three persisted stores to JSON; add an import that validates and
  rehydrates. A button on the Equipment/Settings screen.

## Deferred to v2 (from the approved design)
- Recovery-based rotation (pick emphasis from least-recently-trained muscle groups) — gated on observed override rate.
- EMOM progression rules (kb-emom-swing stays a fixed prescription in v1).
- Full progression-ladder coverage (v1 ships only the obvious chains).
- Automatic deload (v1 = "hold target on a bad day").
- Fix `getWeeklyVolume` UTC date grouping to local (pre-existing; flagged during eng review).
