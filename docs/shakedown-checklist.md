# S3 On-Device Shakedown Checklist

_Scripted checklist from the wave plan (S3). Run on the sideloaded EAS preview APK, on real hardware, untethered (no Metro, airplane mode for at least one pass). Mark each item ✅/❌ with a one-line note. Anything non-blocking goes to the deferred list, not into the wave._

**Build under test:** `eas build -p android --profile preview` — version: ______ · date: ______ · device: ______

## 1. Install & cold start

- [ ] APK sideloads and installs without warnings beyond the normal unknown-sources prompt
- [ ] Cold start reaches the Coach tab with no crash, no red screen, no blank screen
- [ ] App icon and name look right on the launcher
- [ ] Airplane mode on → relaunch → app fully functional (offline-first claim)

## 2. Kill-mid-workout / resume (the headline feature)

- [ ] Start today's workout from Coach → log 2 sets via SetLogger
- [ ] Force-kill the app from the app switcher mid-workout
- [ ] Relaunch → resume prompt appears
- [ ] Accept resume → both logged sets are present, current exercise position correct
- [ ] Repeat once, but decline the resume prompt → session is discarded cleanly, no zombie state

## 3. Locked-screen rest timer ⚠️ (highest-risk unknown — JS timers pause in background)

- [ ] Log a set → rest timer starts → lock the screen for the FULL rest duration → unlock
  - Does the timer show the correct remaining time (i.e. wall-clock-aware), or did it freeze while locked?
- [ ] Same test but unlock halfway through — remaining time correct?
- [ ] Does any alert/sound/vibration fire at rest-end while locked? (Record actual behavior even if none — this calibrates the fix.)
- [ ] Switch to another app (don't lock) during rest → return → timer state correct
- **If this fails:** capture exact observed vs expected times in the notes. Fix comes from measurement (expo-notifications scheduled alert or background-aware timestamps) — do not guess.

## 4. EMOM beep + haptics

- [ ] Run an EMOM block: beep fires at each minute boundary (expo-av on real hardware — never tested)
- [ ] Haptics fire alongside the beep
- [ ] Beep audible with media volume at a normal level; behavior with phone on silent noted
- [ ] EMOM timer survives screen-lock for one minute boundary (same risk class as §3)

## 5. Backup round-trip

- [ ] Export backup → JSON file produced via the share sheet
- [ ] Log one more set (so state differs from the export)
- [ ] Import the exported JSON → state restores to the export point
- [ ] History, equipment, coach profile, and rotation all intact after import

## 6. Full fake session end-to-end

- [ ] Complete an entire generated workout start-to-finish (fake reps, real flow)
- [ ] Completion screen (workout/complete) shows correct summary
- [ ] Session appears in History with correct date and volume
- [ ] Progress tab reflects the session (weekly volume groups by local date — UTC fix 7884fab)

## 7. Day-turnover regeneration (next morning)

- [ ] Next calendar day: Coach generates a NEW workout (rotation advanced, yesterday's plan not reused)
- [ ] Yesterday's completed session still in History
- [ ] Emphasis/focus day matches catalog v3 per-emphasis focus-day expectations

## 8. Safety invariants (must survive on device)

- [ ] Disclaimers visible in ExerciseCard and on the Coach screen
- [ ] autoAdjust is OFF by default in settings/profile

## Notes / friction log

_One line per item is enough. These seed the S4–S5 tuning pass and the next-wave list._

- **2026-06-11 (James, build #3):** Leaving the workout screen and resuming **resets the rest timer**. Likely cause: the wall-clock deadline lives in RestTimer component state/refs, so navigating away unmounts it and the deadline is lost — it needs to live in the active-session store to survive unmount (and process death). Not fixed yet — logged for the post-shakedown fix pass.
- **2026-06-11 (James, build #3):** Feature request: **lock-screen / status-bar indicator of rest time remaining** (likely expo-notifications ongoing notification). Do alongside or after the timer-reset fix above, since both need the deadline persisted outside the component.
- **2026-06-11 (James, build #3):** **RPE and pain inputs need a small in-UI explanation** — what each means and what input is being requested (e.g. RPE = Rating of Perceived Exertion, 1–10, how hard the set felt / how many reps were left in the tank; pain = 0–10 discomfort in the involved area, with 4+ downranking the exercise and 6+ avoiding the movement pattern). Likely an info affordance on the feedback controls in the workout logging UI. Wording must respect the self-tracking-not-medical-advice disclaimers.
- **2026-06-11 (James, build #3, first real session):** **Set logging doesn't know when an exercise is done.** Prescribed 4×6, but after the 4th set the app keeps offering more sets until "Next" is tapped manually. Wanted: SetLogger shows the prescribed set/rep target (e.g. "Set 3 of 4 · 6 reps") and **auto-advances to the next exercise after the final prescribed set is logged** (extra sets still possible, but opt-in rather than default). The target count exists in the plan — the logging UI just doesn't consume it.
- **2026-06-11 (James, build #3, first real session):** **Browsing ahead shouldn't move the workout position.** Wanted: freely cycle through the session's exercises to preview what's coming without affecting the current set cycle — i.e. separate "viewing position" from "logging position" (prev/next currently move the one and only position). Related to the auto-advance item above: the logging position should advance on completed sets, not on navigation.
- **2026-06-11 (James, build #3, first real session):** **Mid-workout swap.** Exercises can be swapped for similar ones when defining the session at the start, but not once the workout has commenced — wanted: swap an upcoming (not-yet-started) exercise for a similar alternative mid-session.
- **2026-06-11 (James, build #3, first real session):** **In-workout "make it harder" escalation.** KB Romanian deadlift 4×5 @ 20kg was far too easy; need a quick way to escalate difficulty when a prescription is trivially light. Natural progression here is the **double-KB RDL** — note this connects to the deferred "F7 double-KB quantity" item (equipment has 2× 24kg, so double-KB variants are feasible). Also a progression-tuning datapoint for S4–S5: hinge-pattern starting loads are too conservative. Currently rest-end is haptic-only (bell sound exists but is only wired to the EMOM timer). Reuse the bell.wav + expo-audio player in RestTimer's onComplete. Note: while the screen is locked, sound won't fire with JS paused — full solution ties into the lock-screen notification item above (expo-notifications can play sound from a scheduled notification).
