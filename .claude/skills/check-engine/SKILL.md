---
name: check-engine
description: Verify Kettlecal engine purity — grep for Date.now/Math.random in src/engine/, run vitest, and type-check. Use before any commit touching the engine.
tools: Bash
---

Run these checks in order and report any failures:

1. `grep -rn "Date\.now\|Math\.random\|require\|import.*expo\|import.*react" /Users/jamesheffer/Kettlecal/kettlecal/src/engine/ || echo "Engine clean"`
2. `cd /Users/jamesheffer/Kettlecal/kettlecal && npx vitest run 2>&1 | tail -10`
3. `cd /Users/jamesheffer/Kettlecal/kettlecal && npx tsc --noEmit 2>&1 | tail -5`

Report pass/fail for each. If any check fails, show the relevant output.
