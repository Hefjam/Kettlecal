# TODOS

## Open items

### Recovery-based rotation (v2)
Pick emphasis from least-recently-trained muscle groups rather than pure round-robin. Gated on observed override rate in production.

### Automatic deload — full auto (v2)
Hold logic exists (hold target on a bad day). Full auto-deload based on sustained stall streak is a v2 feature.

### Session persistence
Active session mid-workout is ephemeral — a crash or app close loses it. Being added separately.

### EAS / dev build setup
`react-native-mmkv` v4 requires a dev build; Expo Go won't work for native runs. EAS setup needed before testing on real devices.

### `expo-av` deprecation (low urgency)
`expo-av` is on a deprecation track in Expo v56; it will eventually be replaced by `expo-audio`. No action required now.

---

## Shipped (reference)

- **Backup / export** — JSON export/import of MMKV state. Shipped in commit 7081fab.
- **`getWeeklyVolume` UTC fix** — local date grouping fix. Shipped in commit 7884fab.
- **Full progression ladders / EMOM progression / deload hold logic** — Shipped in commit e5cfcae.
