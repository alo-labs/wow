---
name: wow
description: WOW — WordPress → Optimized WordPress. Autonomous agent that optimizes any WordPress site to world-class performance through iterative auditing, planning, and execution until diminishing returns.
user-invocable: true
---

# WOW — WordPress → Optimized WordPress

**Author**: Shafqat Ullah | **Org**: Ālo Labs | **Repo**: alo-labs/wow

## Purpose

Autonomously optimize any WordPress site to world-class performance. Orchestrates
community skills, MCP tools, and specialist subagents through a phased loop:
INTAKE → AUDIT → PLAN → EXECUTE → VERIFY → repeat until diminishing returns.

When all community resources are exhausted, applies WordPress and performance
domain expertise directly as a last resort to close remaining gaps.

## Process

### 1. Load community skills

Before doing anything, invoke all bundled community skills to load domain knowledge:
- `@wordpress-performance` — WordPress profiling, caching, DB optimization
- `@wordpress-pro` — transient/object caching, query optimization, asset enqueuing
- `@core-web-vitals` — LCP, CLS, INP scoring and thresholds
- `@web-performance` — loading speed, resource optimization
- `@best-practices` — HTTPS, security headers, modern APIs

If any skill fails to load, note it but continue — do not abort.

### 1b. CLI-first principle and browser automation policy

**CLI-first rule (global — applies to all agents):**
Whenever a CLI alternative exists, use it instead of an MCP or interactive
browser tool. CLIs are faster, cheaper (fewer tokens), more reliable, and
more composable.

**Task domain mapping:**

| Domain | Primary tool | Fallback |
|---|---|---|
| WP tasks (plugins, options, DB, users) | WP-CLI via SSH | WP REST API → browser automation |
| Server tasks (PHP-FPM, OPcache, htaccess, nginx) | SSH only | None — WP-CLI does not apply here |
| Browser tasks (screenshots, UI forms, hosting panels, WP Admin) | Playwright CLI | Claude-in-Chrome → computer-use → user prompt |

**4-tier browser automation ladder (applies globally to all agents):**

**Tier 1 — Playwright CLI:**
- Check: `npx playwright --version >/dev/null 2>&1`
- If available: `npx playwright screenshot --browser=chromium --full-page <url> <path>`
  or `npx playwright evaluate --browser=chromium <url> "<js_expression>"`
- If command exits non-zero or Playwright not found: fall through to Tier 2

**Tier 2 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: use for tasks requiring interactive or visual judgment
- If tool call raises error or returns failure: fall through to Tier 3

**Tier 3 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: screenshot-guided interaction; if failure: fall through to Tier 4

**Tier 4 — user prompt (credentials and sign-in ONLY):**
- Ask the human ONLY for: passwords, API keys, tokens, or authentication steps
- NEVER ask the human to click, navigate, configure, or perform any automatable action

**Human intervention policy:**
The human operating WOW is only asked for credentials and sign-in. All UI
tasks must be attempted via Tiers 1–3 before escalating. No agent should
report a task as failed or skip it solely because a CLI or API is unavailable.

### 2. Initialize session state

Create `/tmp/.wow/` directory. Initialize `session.json`:

```json
{
  "credentials": "provided_in_session",
  "site_url": "",
  "autonomy_mode": "",
  "threshold": 5,
  "max_iterations": 10,
  "current_iteration": 0,
  "consecutive_below_threshold": 0,
  "focus_areas": "everything",
  "status": "intake",
  "ssh_available": false,
  "backups": [],
  "errors": []
}
```

Credentials are NEVER written to session.json or any file. Store only in session context.

### 3. Run INTAKE phase

Invoke `@wow-intake`. Wait for it to complete and return populated session values.
Update session.json with all non-credential values from intake.

### 4. Run AUDIT phase (first baseline)

Invoke `@wow-audit`. This dispatches lighthouse-agent, inventory-agent, and
screenshot-agent in parallel. Wait for all to complete.

Save results to `/tmp/.wow/baseline.json` on the first run.
Save to `/tmp/.wow/iterations/N/audit.json` on subsequent runs (N = current_iteration).

After the baseline audit completes (first run only): dispatch `theme-analysis-agent`.
Save its output to `/tmp/.wow/theme-analysis-baseline.json`.
If the agent returns `status: "skipped"`, log it and continue — non-blocking.

### 5. Loop: PLAN → EXECUTE → VERIFY

Repeat until stop condition is met:

**a. PLAN**: Invoke `@wow-plan`. Save output to `/tmp/.wow/iterations/N/plan.json`.

**b. APPROVAL GATE** (supervised mode only):
Read `session.json`. If `autonomy_mode == "supervised"`:
- Present the ranked action list from `plan.json` to the user
- State: "Iteration N plan ready. Review actions above. Type 'proceed' to execute or describe changes."
- Wait for explicit user confirmation before continuing.

**b2. BACKUP**: Dispatch `backup-agent`.
Save its output to `/tmp/.wow/iterations/N/backup.json`.
Log backup status to `session.json` under `backups[]`:
`{ "iteration": N, "status": "done|partial|failed" }`.
Non-blocking — proceed to EXECUTE regardless of backup outcome.

**b3. SNAPSHOT**: Each execution agent (custom-agent, plugin-agent, provider-agent) runs
its snapshot step automatically at the start of EXECUTE — no separate dispatch needed.
Each agent merges its section into `/tmp/.wow/iterations/N/snapshot.json`.

**c. EXECUTE**: Invoke `@wow-execute`. Save executed actions to `/tmp/.wow/iterations/N/actions.json`.

**c2. VISUAL REGRESSION**: Dispatch `visual-regression-agent`.
Save its output to `/tmp/.wow/iterations/N/visual-regression.json`.
Non-blocking — proceed to VERIFY regardless of result.

If `visual-regression.json` has `status: "regression_flagged"`:
Pause and present to user (even in `autonomy_mode: "autonomous"` — always requires confirmation):

"⚠ Visual regression detected in iteration N (severity: <severity>).
  Judgment: <judgment>
  Roll back iteration N? (yes / no / show diff)"

- "yes": dispatch custom-agent, plugin-agent, provider-agent simultaneously in `mode: "rollback"` with
  the snapshot from iteration N. Write results to `/tmp/.wow/rollback-N.json`. Then continue loop.
- "no": continue loop without rollback.
- "show diff": display `diff_image_path` from `visual-regression.json`, then re-ask.

**d. VERIFY**: Invoke `@wow-verify`. It computes delta_pct and writes `/tmp/.wow/iterations/N/delta.json`.
Read the delta.json. The loop-controller hook will have already evaluated stop conditions.
If delta.json contains `"stop": true`:
  - Dispatch `theme-analysis-agent` for the final analysis.
    Save its output to `/tmp/.wow/iterations/N/theme-analysis-final.json`.
  - Exit the loop and go to step 6.

Note: Do NOT add a new `@wow-audit` invocation here. The final re-audit is the existing `@wow-audit`
already invoked inside the VERIFY step as part of the delta.json calculation. The theme-analysis-agent
dispatch follows that existing audit — no additional audit step is needed.
Otherwise increment `current_iteration` in session.json and loop back to PLAN.

### 6. Generate REPORT

Invoke `@wow-report`. Wait for it to complete.
The report is emitted to the terminal and saved to `/tmp/.wow/report.html`.

### 7. Last-resort intervention

If VERIFY shows improvement is still possible (gaps exist in plan.json) but no
community resource could address them, the orchestrator applies direct intervention:
- Read gap descriptions from the latest `plan.json` `unresolved_gaps` array
- Apply WordPress and web performance expertise directly:
  - Write custom PHP snippets to a must-use plugin (`wp-content/mu-plugins/wow-custom.php`)
  - Generate optimized `.htaccess` rules
  - Modify `wp-config.php` for performance constants
  - Inline critical CSS via theme `functions.php`
- Document all direct interventions in the REPORT under "Custom Interventions"
- Loop back to VERIFY after interventions

## Error Handling

- If a subagent fails, log the failure to `session.json` under `errors[]` and continue
- If credentials are rejected by the target site, stop and ask the user to re-provide them
- If the target site is unreachable, stop and report the connectivity issue
- Never leave the target site in a broken state — if EXECUTE fails mid-run, report
  exactly what was and was not applied so the user can assess

## /wow rollback Command

At any point during the session, if the user types `/wow rollback`:

1. Read `session.json` to get `current_iteration` (N).

2. Ask:
   "Roll back to after which iteration? Current: N. Enter a number (0 = undo everything WOW did):"

3. Wait for user input T.

4. Confirm:
   "This will undo iterations T+1 through N. Proceed? (yes/no)"

5. On "yes":
   - Dispatch custom-agent, plugin-agent, provider-agent simultaneously in `mode: "rollback"`
     with snapshots from iterations T+1 through N (in reverse order — pass all snapshot
     file paths; each agent uses the range as described in its own undo mode spec).
   - Wait for all three agents to complete.
   - Dispatch `visual-regression-agent` to verify site visually post-rollback.
   - Write results to `/tmp/.wow/rollback-N.json`:
     ```json
     {
       "rolled_back_from": N,
       "rolled_back_to": T,
       "timestamp": "<ISO 8601>",
       "file_restores": [],
       "plugin_deactivations": [],
       "server_restores": [],
       "visual_check": "clean|regression_flagged|skipped",
       "partial_failure": false
     }
     ```
     `partial_failure: true` if any individual restore step failed.
   - Emit rollback summary to terminal.

6. On "no": return to normal session state without changes.
