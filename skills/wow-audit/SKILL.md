---
name: wow-audit
description: WOW audit phase — dispatches lighthouse, inventory, and screenshot agents in parallel to measure current site performance.
---

# WOW Audit

## Purpose

Measure the current state of the WordPress site by running three specialist agents
in parallel. Produces a complete audit snapshot saved to state files.

## Process

### 1. Dispatch parallel agents

Launch all three agents simultaneously using the Agent tool:

- **lighthouse-agent**: Read `agents/lighthouse-agent.md` for the full prompt.
  Pass: site URL from session.json, focus_areas from session.json.
  Output: writes to `/tmp/.wow/iterations/N/lighthouse.json`

- **inventory-agent**: Read `agents/inventory-agent.md` for the full prompt.
  Pass: site URL, WP credentials (from session context), SSH details if available.
  Output: writes to `/tmp/.wow/iterations/N/inventory.json`

- **screenshot-agent**: Read `agents/screenshot-agent.md` for the full prompt.
  Pass: site URL.
  Output: saves screenshot, writes path to `/tmp/.wow/iterations/N/screenshot-before.json`

### 2. Wait for all agents to complete

Do not proceed until all three agents have returned results.

### 3. Merge into audit.json

Read all three output files and merge into a single audit snapshot:

```json
{
  "iteration": "N",
  "timestamp": "<ISO 8601>",
  "scores": {
    "performance": 0,
    "accessibility": 0,
    "best_practices": 0,
    "seo": 0
  },
  "core_web_vitals": {
    "lcp_ms": 0,
    "cls": 0,
    "inp_ms": 0,
    "fcp_ms": 0,
    "ttfb_ms": 0
  },
  "inventory": {},
  "screenshot_path": ""
}
```

Write to `/tmp/.wow/iterations/N/audit.json`.

On iteration 0 (baseline), also copy to `/tmp/.wow/baseline.json`.

### 4. Report snapshot

Emit a brief summary:
"Audit complete — Performance: X | LCP: Xms | CLS: X | INP: Xms"
