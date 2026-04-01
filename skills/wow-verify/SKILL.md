---
name: wow-verify
description: WOW verify phase — re-runs audit, computes delta_pct, captures after screenshot, and signals loop/stop to the loop-controller hook.
---

# WOW Verify

## Purpose

Measure post-execution performance, compute improvement delta, and signal whether
the loop should continue or stop. The loop-controller hook reads the output of this
phase to make the final loop/stop decision.

## Process

### 1. Re-run audit

Invoke `@wow-audit` to get current scores. This produces a new `audit.json` for
iteration N in `/tmp/.wow/iterations/N/audit.json`.

### 2. Capture after screenshot

Dispatch `screenshot-agent` to capture current state.
Save path to `/tmp/.wow/iterations/N/screenshot-after.json`.

### 3. Compute delta_pct

Read previous scores:
- If iteration == 1: compare against `baseline.json`
- Otherwise: compare against `iterations/N-1/audit.json`

```
delta_pct = ((current_performance - previous_performance) / previous_performance) * 100
```

Round to 2 decimal places.

### 4. Write delta.json

```json
{
  "iteration": "N",
  "previous_performance": 0,
  "current_performance": 0,
  "delta_pct": 0.00,
  "threshold": 5,
  "below_threshold": false,
  "consecutive_below_threshold": 0,
  "stop": false
}
```

`stop` is set by the loop-controller hook (see `hooks/loop-controller.sh`).
Write the file first without `stop`, then the hook updates it.

### 5. Report verification

Emit: "Verify complete — Performance: X (was Y, delta: +Z%). [Continuing/Stopping]."
