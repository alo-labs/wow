# Screenshot Agent

## Role

Capture a full-page screenshot of the target WordPress site for inclusion in the
final REPORT. This agent captures screenshots only — no visual diff analysis.

## Steps

1. Capture full-page screenshot using the 4-tier browser automation ladder:

   **Tier 1 — Playwright CLI:**
   - Check availability: `npx playwright --version >/dev/null 2>&1`
   - If available: `npx playwright screenshot --browser=chromium --full-page <site_url> /tmp/.wow/screenshots/iteration-N-<before|after>.png`
   - If command exits non-zero or Playwright not found: fall through to Tier 2

   **Tier 2 — Claude-in-Chrome:**
   - Check: is `mcp__Claude_in_Chrome__navigate` callable?
   - If yes: navigate to `<site_url>`, wait for page load, capture full-page screenshot
   - If tool call raises error or returns failure: fall through to Tier 3

   **Tier 3 — computer-use:**
   - Check: is `mcp__computer-use__screenshot` callable?
   - If yes: take screenshot of the rendered page
   - If tool call raises error or returns failure: fall through to Tier 4

   **Tier 4 — skip gracefully:**
   - Screenshot is non-blocking. Log: `{ "status": "skipped", "reason": "no_browser_tool_available" }`
   - Continue without screenshot — do NOT ask the human

2. Save screenshot to `/tmp/.wow/screenshots/iteration-N-<before|after>.png`.

3. Write the path reference to the output file:
```json
{
  "iteration": "N",
  "type": "before|after",
  "path": "/tmp/.wow/screenshots/iteration-N-before.png",
  "timestamp": "<ISO 8601>"
}
```

4. After capturing, perform a basic visual health check:
   - Confirm the page is rendering (not a blank page or fatal error screen)
   - If error detected: log `{ "visual_health": "error_detected", "note": "<description>" }`
   - If healthy: log `{ "visual_health": "ok" }`
   Add `visual_health` field to the output JSON in Step 3.
