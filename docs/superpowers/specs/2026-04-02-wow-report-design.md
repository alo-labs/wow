# WOW — Report Skill Design

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alo-labs/wow
**Date**: 2026-04-02
**Sub-project**: 4 of N — Report Skill

---

## Overview

The `wow-report` skill extracts the inline Step 6 reporting logic from the
main orchestrator into a dedicated phase skill + agent pair. It produces two
output formats after every WOW run: a markdown summary emitted to the terminal
and a styled HTML file saved to `/tmp/.wow/report.html`. The HTML file is
opened automatically in the browser using the global browser automation ladder.

---

## Architecture

```
New files:
  skills/wow-report/SKILL.md   ← phase coordinator; dispatches report-agent
  agents/report-agent.md       ← reads state files; produces markdown + HTML

Modified:
  skills/wow/SKILL.md          ← Step 6 inline logic replaced with: Invoke @wow-report
```

`wow-report` dispatches `report-agent` and waits for it to complete. After
the agent returns, `wow-report` emits the markdown to the terminal, confirms
the HTML file path, and opens the file in the browser.

---

## Data Sources

`report-agent` reads all state files from `/tmp/.wow/`:

| File | What it provides |
|---|---|
| `session.json` | site URL, stop reason, total iterations, autonomy mode |
| `baseline.json` | iteration-0 Lighthouse scores and Core Web Vitals |
| `iterations/*/audit.json` | per-iteration Lighthouse scores and CWVs |
| `iterations/*/delta.json` | per-iteration delta_pct, stop flag, consecutive_below_threshold |
| `iterations/*/actions.json` | applied actions grouped by domain |
| `iterations/*/hostinger-actions.json` | Hostinger-specific actions (included if file exists) |
| `iterations/*/screenshot-after.json` | path to after screenshot for each iteration |
| Latest `iterations/N/plan.json` | `unresolved_gaps` array for remaining gaps section |

The final-iteration `audit.json` provides "after" scores. `baseline.json`
provides "before" scores. The before screenshot path is taken from the
audit phase screenshot output of iteration 0.

---

## Markdown Output (terminal)

Emitted directly to the terminal by `wow-report` after `report-agent` returns:

```markdown
# WOW Report — <site_url>

## Performance Summary
| Metric         | Before | After | Delta   |
|----------------|--------|-------|---------|
| Performance    | 45     | 92    | +104.4% |
| Accessibility  | 78     | 91    | +16.7%  |
| Best Practices | 83     | 100   | +20.5%  |
| SEO            | 72     | 95    | +31.9%  |

## Core Web Vitals
| Metric | Before | After  |
|--------|--------|--------|
| LCP    | 4.2s   | 1.8s   |
| CLS    | 0.24   | 0.02   |
| INP    | 380ms  | 95ms   |

## Run Summary
Iterations: 3 | Stop reason: delta below threshold (2 consecutive)

## Changes Applied
### Plugins (N actions)
- <action> — <status>

### Hosting (N actions)
- <action> — <status>

### Custom (N actions)
- <action> — <status>

## Remaining Gaps
- <gap description> (from unresolved_gaps in final plan.json)
(none, if all gaps were closed)

## Screenshots
Before: /tmp/.wow/screenshots/iteration-0-before.png
After:  /tmp/.wow/screenshots/iteration-N-after.png

Report saved to: /tmp/.wow/report.html
```

---

## HTML Output

Saved to `/tmp/.wow/report.html`. Constructed by `report-agent` as a plain
HTML string with inline CSS — no external dependencies, no templating library.

**Structure:**
- Header: site URL + run timestamp
- Performance summary table with color-coded delta cells (green = improvement, red = regression, grey = unchanged)
- Core Web Vitals table with pass/fail indicators against standard thresholds (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- Run summary: iterations count + stop reason
- Changes Applied: collapsible `<details>` sections per domain (Plugins, Hosting, Custom)
- Remaining Gaps: bulleted list (omitted if empty)
- Screenshots: before/after side-by-side as `<img>` tags using absolute file paths

**Browser open:** After writing the file, `wow-report` opens it using the
3-tier browser automation ladder:
- Tier 1: Claude-in-Chrome — `navigate` to `file:///tmp/.wow/report.html`
- Tier 2: computer-use — open the file via OS file open
- Tier 3: print path only — `Report saved to: /tmp/.wow/report.html`

---

## Graceful Degradation

| Condition | Behavior |
|---|---|
| `baseline.json` missing | Skip before/after comparison; note "baseline not available" |
| Screenshot files missing | Omit screenshot section; do not fail |
| `unresolved_gaps` absent from plan.json | Omit remaining gaps section |
| `hostinger-actions.json` absent | Skip; only show actions from `actions.json` |
| HTML write fails | Log warning; markdown output still emitted |
| Browser automation unavailable | Print file path only |

---

## Orchestrator Update

`skills/wow/SKILL.md` Step 6 is replaced from 8 lines of inline report logic
to:

```markdown
### 6. Generate REPORT

Invoke `@wow-report`. Wait for it to complete.
The report is emitted to the terminal and saved to `/tmp/.wow/report.html`.
```

All other orchestrator steps are unchanged.

---

## Files

| File | Type | Change |
|---|---|---|
| `skills/wow-report/SKILL.md` | Markdown | **Create** — report phase coordinator |
| `agents/report-agent.md` | Markdown | **Create** — data collection + markdown + HTML generation |
| `skills/wow/SKILL.md` | Markdown | **Modify** — replace Step 6 inline logic with `@wow-report` invocation |
