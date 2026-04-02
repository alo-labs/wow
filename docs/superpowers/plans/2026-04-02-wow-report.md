# WOW Report Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract inline Step 6 reporting from the WOW orchestrator into a dedicated `wow-report` skill + `report-agent`, producing both a markdown terminal summary and a styled HTML file at `/tmp/.wow/report.html`.

**Architecture:** `skills/wow-report/SKILL.md` is the phase coordinator — it dispatches `report-agent`, then emits markdown to the terminal and opens the HTML file via the 3-tier browser automation ladder. `agents/report-agent.md` reads all state files and constructs both outputs. `skills/wow/SKILL.md` Step 6 is replaced with a single `@wow-report` invocation.

**Tech Stack:** Claude Code markdown skills, inline HTML + CSS string construction, 3-tier browser automation ladder (Claude-in-Chrome → computer-use → print path).

**Spec:** `docs/superpowers/specs/2026-04-02-wow-report-design.md`

---

## File Map

| File | Type | Change |
|---|---|---|
| `skills/wow-report/SKILL.md` | Markdown | **Create** — report phase coordinator |
| `agents/report-agent.md` | Markdown | **Create** — data collection + markdown + HTML generation |
| `skills/wow/SKILL.md` | Markdown | **Modify** — replace Step 6 inline logic with `@wow-report` invocation |

---

## Task 1: Create `agents/report-agent.md`

**Files:**
- Create: `agents/report-agent.md`

- [ ] **Step 1: Write the agent file**

Create `agents/report-agent.md` with the following content:

```markdown
# Report Agent

## Role

Read all WOW session state files and produce two outputs:
1. A markdown summary string (returned to `wow-report` for terminal emission)
2. A styled HTML file written to `/tmp/.wow/report.html`

## Steps

### 1. Read session context

Read `/tmp/.wow/session.json`:
- Extract: `site_url`, `current_iteration` (total iterations run)

### 2. Read baseline scores

Read `/tmp/.wow/baseline.json`:
- Extract `scores` (performance, accessibility, best_practices, seo)
- Extract `core_web_vitals` (lcp_ms, cls, inp_ms)
- Extract `screenshot_path` as `before_screenshot`

If file is missing: set all before values to `"N/A"` and note "baseline not available".

### 3. Read final iteration scores

Determine N = `current_iteration` from session.json.
Read `/tmp/.wow/iterations/N/audit.json`:
- Extract `scores` and `core_web_vitals` as "after" values
- Extract `screenshot_path` as `after_screenshot`

### 4. Read stop reason

Read `/tmp/.wow/iterations/N/delta.json`:
- Extract `delta_pct`, `consecutive_below_threshold`, `stop` reason
- Stop reason label:
  - If `consecutive_below_threshold >= 2`: "delta below threshold (2 consecutive)"
  - If iterations == max_iterations from session.json: "max iterations reached"
  - Otherwise: "manual stop"

### 5. Collect all applied actions

For each iteration 1 through N:
- Read `/tmp/.wow/iterations/<i>/actions.json` → collect `applied` array
- If `/tmp/.wow/iterations/<i>/hostinger-actions.json` exists → append its `actions` array
- Group all collected actions by `domain`: plugin, provider, custom

### 6. Read remaining gaps

Read `/tmp/.wow/iterations/N/plan.json`:
- Extract `unresolved_gaps` array
- If file missing or array empty: gaps = []

### 7. Compute delta values

For each Lighthouse score (performance, accessibility, best_practices, seo):
```
delta = after - before
delta_pct = ((after - before) / before) * 100  (round to 1 decimal)
prefix = "+" if delta > 0, "" if delta == 0, "" if delta < 0 (negative shows naturally)
```

If before value is "N/A": show delta as "—"

### 8. Build markdown summary

Construct this string (substituting real values):

```
# WOW Report — <site_url>

## Performance Summary
| Metric         | Before | After | Delta    |
|----------------|--------|-------|----------|
| Performance    | <n>    | <n>   | <+n.n%>  |
| Accessibility  | <n>    | <n>   | <+n.n%>  |
| Best Practices | <n>    | <n>   | <+n.n%>  |
| SEO            | <n>    | <n>   | <+n.n%>  |

## Core Web Vitals
| Metric | Before  | After  | Threshold | Status |
|--------|---------|--------|-----------|--------|
| LCP    | <n>s    | <n>s   | < 2.5s    | ✓/✗    |
| CLS    | <n>     | <n>    | < 0.1     | ✓/✗    |
| INP    | <n>ms   | <n>ms  | < 200ms   | ✓/✗    |

## Run Summary
Iterations: <N> | Stop reason: <reason>

## Changes Applied
### Plugins (<count> actions)
<list: - <action> — <status>>

### Hosting (<count> actions)
<list: - <action> — <status>>

### Custom (<count> actions)
<list: - <action> — <status>>

## Remaining Gaps
<list of unresolved_gaps, or "(none — all gaps closed)" if empty>

## Screenshots
Before: <before_screenshot path or "not available">
After:  <after_screenshot path or "not available">

Report saved to: /tmp/.wow/report.html
```

CWV status: ✓ if after value meets threshold, ✗ if not.
LCP: convert lcp_ms to seconds (divide by 1000, round to 1 decimal).
INP: show as ms.

### 9. Build HTML file

Construct an HTML string and write to `/tmp/.wow/report.html`.

Structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WOW Report — <site_url></title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .positive { color: #166534; background: #dcfce7; }
    .negative { color: #991b1b; background: #fee2e2; }
    .neutral { color: #374151; }
    .pass { color: #166534; }
    .fail { color: #991b1b; }
    details { margin-bottom: 1rem; }
    summary { cursor: pointer; font-weight: 600; padding: 0.5rem 0; }
    .screenshots { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .screenshots img { max-width: 48%; border: 1px solid #ddd; border-radius: 4px; }
    .screenshots .label { font-size: 0.85rem; color: #666; margin-top: 0.25rem; }
    .gap-list { margin: 0; padding-left: 1.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>WOW Report</h1>
  <div class="subtitle"><a href="<site_url>"><site_url></a></div>
  <div class="meta">Iterations: <N> &nbsp;|&nbsp; Stop reason: <reason> &nbsp;|&nbsp; <timestamp></div>

  <h2>Performance Summary</h2>
  <table>
    <tr><th>Metric</th><th>Before</th><th>After</th><th>Delta</th></tr>
    <!-- one row per metric; delta cell gets class="positive|negative|neutral" -->
  </table>

  <h2>Core Web Vitals</h2>
  <table>
    <tr><th>Metric</th><th>Before</th><th>After</th><th>Threshold</th><th>Status</th></tr>
    <!-- status cell gets class="pass|fail" -->
  </table>

  <h2>Changes Applied</h2>
  <details open>
    <summary>Plugins (<count>)</summary>
    <ul><!-- action items --></ul>
  </details>
  <details>
    <summary>Hosting (<count>)</summary>
    <ul><!-- action items --></ul>
  </details>
  <details>
    <summary>Custom (<count>)</summary>
    <ul><!-- action items --></ul>
  </details>

  <h2>Remaining Gaps</h2>
  <ul class="gap-list"><!-- gaps or "(none)" --></ul>

  <h2>Screenshots</h2>
  <div class="screenshots">
    <div><img src="<before_path>" alt="Before"><div class="label">Before</div></div>
    <div><img src="<after_path>" alt="After"><div class="label">After</div></div>
  </div>
</body>
</html>
```

Delta cell CSS class rules:
- delta > 0 → `class="positive"`
- delta < 0 → `class="negative"`
- delta == 0 or N/A → `class="neutral"`

If screenshots are unavailable: omit the screenshots section entirely.

### 10. Return output

Return:
```json
{
  "markdown": "<full markdown string>",
  "html_path": "/tmp/.wow/report.html",
  "status": "done"
}
```

If HTML write fails: set `html_path: null`, `status: "done_no_html"`, include `error` field.
```

- [ ] **Step 2: Verify file was created**

```bash
ls agents/report-agent.md
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add agents/report-agent.md
git commit -m "$(cat <<'EOF'
feat: add report-agent for markdown + HTML report generation

Reads all WOW state files, builds performance summary tables,
CWV pass/fail indicators, action log by domain, remaining gaps,
and before/after screenshot comparison.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `skills/wow-report/SKILL.md`

**Files:**
- Create: `skills/wow-report/SKILL.md`

- [ ] **Step 1: Write the skill file**

Create `skills/wow-report/SKILL.md`:

```markdown
---
name: wow-report
description: WOW report phase — dispatches report-agent to produce a markdown terminal summary and styled HTML file after the optimization loop completes.
---

# WOW Report

## Purpose

Generate the final WOW optimization report after the loop exits. Produces
a markdown summary to the terminal and a styled HTML file at `/tmp/.wow/report.html`.

## Process

### 1. Dispatch report-agent

Read `agents/report-agent.md` and dispatch it as a subagent.
Pass: no additional context needed — report-agent reads all state from `/tmp/.wow/`.

Wait for the agent to return.

### 2. Emit markdown to terminal

Read the `markdown` field from report-agent's return value.
Emit it directly to the terminal as formatted output.

### 3. Open HTML report

Use the 3-tier browser automation ladder to open `/tmp/.wow/report.html`:

**Tier 1 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate to `file:///tmp/.wow/report.html`
- If tool call raises error or returns failure: fall through to Tier 2

**Tier 2 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: open the file using OS file-open via computer-use
- If tool call raises error or returns failure: fall through to Tier 3

**Tier 3 — print path:**
- Emit: "Report saved to: /tmp/.wow/report.html"
- Do NOT ask the human to open it

### 4. Handle HTML failure

If report-agent returned `status: "done_no_html"`:
- Emit the markdown summary only
- Log: "HTML report could not be saved: <error>"
- Do NOT fail — markdown output is sufficient
```

- [ ] **Step 2: Verify file was created**

```bash
ls skills/wow-report/SKILL.md
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add skills/wow-report/SKILL.md
git commit -m "$(cat <<'EOF'
feat: add wow-report skill as dedicated report phase coordinator

Dispatches report-agent, emits markdown to terminal, opens HTML
via 3-tier browser automation ladder (no human prompt for file open).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `skills/wow/SKILL.md`

**Files:**
- Modify: `skills/wow/SKILL.md`

- [ ] **Step 1: Replace Step 6 inline logic**

Find the current Step 6 block (approximately lines 112–123):

```markdown
### 6. Generate REPORT

Read `baseline.json` and all `iterations/*/delta.json` files.
Read `iterations/*/actions.json` for the complete change log.

Produce a final report covering:
- Before/after Lighthouse Performance, Accessibility, Best Practices, SEO scores
- Before/after Core Web Vitals (LCP, CLS, INP)
- Total iterations run and why the loop stopped
- All changes applied (grouped by domain: plugins, hosting, custom)
- Any remaining gaps with explanation of why they could not be closed
- Before/after screenshot references
```

Replace with:

```markdown
### 6. Generate REPORT

Invoke `@wow-report`. Wait for it to complete.
The report is emitted to the terminal and saved to `/tmp/.wow/report.html`.
```

- [ ] **Step 2: Verify the edit**

Read `skills/wow/SKILL.md` and confirm:
- Step 6 is now 3 lines only
- Step 7 (Last-resort intervention) and the Error Handling section are unchanged
- The new `@wow-report` invocation is clean and consistent with other `@wow-*` calls

- [ ] **Step 3: Commit**

```bash
git add skills/wow/SKILL.md
git commit -m "$(cat <<'EOF'
refactor: replace inline Step 6 report logic with @wow-report invocation

Delegates report generation to dedicated wow-report skill + report-agent.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Run validation script

**Files:**
- Read: `scripts/validate-plugin.sh`

- [ ] **Step 1: Run validation**

```bash
bash scripts/validate-plugin.sh
```

Expected: 53 existing checks pass. The script does not check for `wow-report`
skill structure yet — verify manually:

```bash
ls skills/wow-report/SKILL.md
ls agents/report-agent.md
grep "wow-report" skills/wow/SKILL.md
```

Expected:
- Both files exist
- `wow-report` appears in `wow/SKILL.md` Step 6

- [ ] **Step 2: Commit only if validation required fixes**

Only commit if you had to fix something. Otherwise skip.
