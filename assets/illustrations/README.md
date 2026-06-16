# Exercise Illustrations — Asset Spec

One synthwave line-art illustration per movement pattern.
Each file maps 1:1 to a `MovementPattern` value in `src/types/index.ts`.

## Target style

- **Look:** Neon line art, Hotline Miami / retrowave aesthetic — think single-colour
  outlines on a transparent background, similar to the equipment icons already in
  `assets/icons/`.
- **Format:** Transparent PNG (no background fill — the card supplies the dark bg).
- **Size:** 512 × 512 px source; Metro will scale to device density automatically.
- **Colour:** Primary stroke in `#ff2e88` (acid magenta) with optional `#19e0c8`
  (teal) accent lines. No gradients — flat/outlined only.

## Files needed (17 patterns)

| Filename                     | MovementPattern    |
|------------------------------|--------------------|
| `vertical_pull.png`          | `vertical_pull`    |
| `horizontal_pull.png`        | `horizontal_pull`  |
| `horizontal_push.png`        | `horizontal_push`  |
| `dip.png`                    | `dip`              |
| `vertical_push.png`          | `vertical_push`    |
| `core.png`                   | `core`             |
| `squat.png`                  | `squat`            |
| `lunge.png`                  | `lunge`            |
| `hinge.png`                  | `hinge`            |
| `swing.png`                  | `swing`            |
| `clean.png`                  | `clean`            |
| `press.png`                  | `press`            |
| `row.png`                    | `row`              |
| `getup.png`                  | `getup`            |
| `snatch.png`                 | `snatch`           |
| `carry.png`                  | `carry`            |
| `full_body.png`              | `full_body`        |

## Wiring real art in

Once a PNG is ready, open `src/data/exerciseIllustrations.ts` and replace the
`source: null` for that pattern with a `require()` call:

```ts
vertical_pull: {
  source: require('../../assets/illustrations/vertical_pull.png'),
  formCue: '...',
},
```

The `ExerciseIllustration` component checks `entry.source != null` and switches
automatically from the brand-icon fallback to the real image. No other code
changes are needed.
