# TODOS

_Current work queue lives in `docs/wave-plan-2026-06-10.md` (S1–S5). State as of 2026-06-10 (this session): S1 committed locally (ui restyle + catalog v3 + gitignore); S2 config committed (`android.package`, `eas.json`). **Blocked on James:** `git push origin main` (sandbox has no GitHub creds), then EAS cloud build needs his Expo login. Next: push → CI green → `eas build -p android --profile preview` → sideload → S3 shakedown._

## Open items

### Recovery-based rotation (v2)
Pick emphasis from least-recently-trained muscle groups rather than pure round-robin. Gated on observed override rate in production.

### Automatic deload — full auto (v2)
Hold logic exists (hold target on a bad day). Full auto-deload based on sustained stall streak is a v2 feature.

### EAS / dev build setup
Config done (`eas.json`, `android.package`, 2026-06-10). Remaining: Expo login, cloud build (preview APK), sideload.

### `expo-av` deprecation (low urgency)
`expo-av` is on a deprecation track in Expo v56; it will eventually be replaced by `expo-audio`. No action required now.

---

## Shipped (reference)

- **Active-session persistence + resume prompt** — Shipped in commit 5c96021.
- **CI (tsc + vitest + web export + Pages deploy)** — Shipped in commit 8070b76.
- **Catalog v3 + restyle pass 2** — Committed 2026-06-10 (da2b0be, 2ecb1f9).
- **Backup / export** — JSON export/import of MMKV state. Shipped in commit 7081fab.
- **`getWeeklyVolume` UTC fix** — local date grouping fix. Shipped in commit 7884fab.
- **Full progression ladders / EMOM progression / deload hold logic** — Shipped in commit e5cfcae.
