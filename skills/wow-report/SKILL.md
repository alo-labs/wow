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

Use the 4-tier browser automation ladder to open `/tmp/.wow/report.html`:

**Tier 1 — Playwright CLI:**
- Check: `npx playwright --version >/dev/null 2>&1`
- If available: `npx playwright screenshot --browser=chromium file:///tmp/.wow/report.html /tmp/.wow/report-screenshot.png`
  (This opens the file in a real browser to verify it renders correctly.)
- If not available or fails: fall through to Tier 2

**Tier 2 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate to `file:///tmp/.wow/report.html`
- If tool call raises error or returns failure: fall through to Tier 3

**Tier 3 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: open the file using OS file-open via computer-use
- If tool call raises error or returns failure: fall through to Tier 4

**Tier 4 — print path:**
- Emit: "Report saved to: /tmp/.wow/report.html"
- Do NOT ask the human to open it

### 4. Handle HTML failure

If report-agent returned `status: "done_no_html"`:
- Emit the markdown summary only
- Log: "HTML report could not be saved: <error>"
- Do NOT fail — markdown output is sufficient
