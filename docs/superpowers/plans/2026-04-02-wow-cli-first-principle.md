# WOW CLI-First Principle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a global CLI-first principle across all WOW agents — resolving two PENDING MCP entries in `wow-manifest.json`, adding Playwright CLI as Tier 1 of the browser automation ladder in all browser-action agents, and formalizing WP-CLI native usage.

**Architecture:** Eight targeted file modifications — manifest, install script, orchestrator policy, and five browser-action agents. No new files. Each task is a self-contained edit with a commit. Read-only agents (inventory, plan, lighthouse) are not touched.

**Tech Stack:** JSON (manifest), bash (install.sh), markdown (skills + agents), Playwright CLI (`npx playwright`)

**Spec:** `docs/superpowers/specs/2026-04-02-wow-cli-first-principle.md`

---

## File Map

| File | Type | Change |
|---|---|---|
| `wow-manifest.json` | JSON | Remove 2 PENDING MCP entries; add `cli_tools`; restructure `browser_automation` |
| `scripts/install.sh` | Bash | Add Playwright CLI install step; remove PENDING note |
| `skills/wow/SKILL.md` | Markdown | Update §1b — 4-tier ladder + CLI-first rule + task domain mapping |
| `agents/screenshot-agent.md` | Markdown | Playwright CLI → Tier 1; Claude-in-Chrome → Tier 2 |
| `agents/plugin-agent.md` | Markdown | Playwright CLI → Tier 1 of browser fallback |
| `agents/provider-agent.md` | Markdown | Playwright CLI → Tier 1 in CDN + hosting panel sections |
| `agents/custom-agent.md` | Markdown | Playwright CLI → Tier 1 in browser automation path |
| `agents/providers/hostinger-agent.md` | Markdown | Playwright CLI → Tier 1 of hPanel ladder |

### Not Changed (intentional carve-outs)

| File | Reason |
|---|---|
| `agents/report-agent.md` | Report HTML viewing is interactive — the user looks at the rendered report in a real browser, not a headless screenshot. Claude-in-Chrome stays Tier 1 here. |
| `skills/wow-report/SKILL.md` | Same reason — HTML file open is an interactive one-off, not a headless automation task. |
| `agents/inventory-agent.md` | Read-only agent — reads headers/API, no browser actions. |
| `agents/plan-agent.md` | Read-only agent — synthesizes data, no browser actions. |
| `agents/lighthouse-agent.md` | Uses lighthouse-mcp (no CLI alternative for structured Lighthouse scores), no direct browser calls. |

---

## Task 1: Update `wow-manifest.json`

**Files:**
- Modify: `wow-manifest.json`

- [ ] **Step 1: Read the current file**

Read `wow-manifest.json` and confirm the three sections to change:
1. `mcp_servers` — has `"browser"` and `"wp-cli"` PENDING entries
2. No `cli_tools` key yet
3. `browser_automation` — has `primary`/`fallback`/`last_resort` keys

- [ ] **Step 2: Apply all three changes**

Replace the `mcp_servers` section to remove the two PENDING entries:
```json
"mcp_servers": {
  "lighthouse": "priyankark/lighthouse-mcp"
},
```

Add a new `cli_tools` key immediately after `mcp_servers`:
```json
"cli_tools": {
  "_note": "CLI tools used directly — no MCP wrapper. CLIs are preferred over MCPs whenever a CLI alternative exists.",
  "browser_automation": "playwright-cli — npx playwright screenshot/evaluate (install via scripts/install.sh)",
  "wp_management": "wp-cli — native WP-CLI via SSH (wp plugin install, wp option update, wp db optimize, etc.)"
},
```

Replace the `browser_automation` object with the 4-tier structure:
```json
"browser_automation": {
  "_note": "4-tier browser automation ladder for all browser-action agents. See skills/wow/SKILL.md §1b.",
  "tier1": "playwright-cli",
  "tier2": "Claude-in-Chrome",
  "tier3": "computer-use",
  "tier4": "user_prompt (credentials and sign-in only)"
},
```

- [ ] **Step 3: Validate JSON**

```bash
jq empty wow-manifest.json && echo "valid" || echo "invalid JSON"
```
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add wow-manifest.json
git commit -m "$(cat <<'EOF'
feat: resolve PENDING MCP entries; add cli_tools; upgrade to 4-tier browser ladder

Removes browser and wp-cli PENDING MCP entries — both replaced by native
CLIs. Adds cli_tools section documenting playwright-cli and wp-cli.
Restructures browser_automation to tier1/tier2/tier3/tier4 keys.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `scripts/install.sh`

**Files:**
- Modify: `scripts/install.sh`

- [ ] **Step 1: Read the current file**

Read `scripts/install.sh` and note:
1. The `--- Installing MCP servers ---` section (currently only lighthouse)
2. The final `ℹ Note: browser MCP and WP-CLI MCP are PENDING...` line that needs to be removed

- [ ] **Step 2: Add Playwright CLI install section**

After the `--- Installing MCP servers ---` section and its lighthouse block, add:

```bash
echo ""
echo "--- Installing Playwright CLI browser (for browser automation) ---"

npx playwright install --with-deps chromium \
  && echo "  ✓ playwright" || echo "  ⚠ playwright install failed (non-fatal)"
```

- [ ] **Step 3: Remove the PENDING note**

The current file ends with two lines:
```bash
echo "⚡ WOW installed. Restart Claude Code / Claude Desktop, then run /wow to start."
echo ""
echo "ℹ Note: browser MCP and WP-CLI MCP are PENDING evaluation. Check https://github.com/alo-labs/wow for updates."
```

Remove only the final `ℹ Note:` echo line and the blank `echo ""` line immediately before it. The restart echo already exists — do NOT add it again. The file should end at the restart echo after this step.

- [ ] **Step 4: Verify the file looks correct**

Read `scripts/install.sh` and confirm:
- Playwright install block appears after lighthouse MCP section
- No PENDING note at the bottom
- Final line is the restart echo

- [ ] **Step 5: Commit**

```bash
git add scripts/install.sh
git commit -m "$(cat <<'EOF'
feat: add Playwright CLI install step; remove PENDING MCP note

Installs chromium browser for Playwright CLI as part of plugin setup.
Idempotent — safe to run multiple times. Removes stale PENDING note.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `skills/wow/SKILL.md` — Section 1b

**Files:**
- Modify: `skills/wow/SKILL.md`

- [ ] **Step 1: Read the current file**

Read `skills/wow/SKILL.md` and locate section `### 1b. Browser automation policy`.

Current content of section 1b ends with:
```
If Claude-in-Chrome is not installed or not signed in, note it but
continue — Tier 2 (computer-use) handles this case. Only escalate to
the user if both tiers are unavailable AND credentials are required.
```

- [ ] **Step 2: Replace section 1b**

Replace the entire `### 1b. Browser automation policy` section with:

```markdown
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
```

- [ ] **Step 3: Verify the edit**

Read `skills/wow/SKILL.md` and confirm:
- Section 1b has the new CLI-first rule, task domain table, and 4-tier ladder
- Section 2 (Initialize session state) is immediately after — unchanged
- All other steps are unchanged

- [ ] **Step 4: Commit**

```bash
git add skills/wow/SKILL.md
git commit -m "$(cat <<'EOF'
feat: upgrade wow orchestrator to CLI-first + 4-tier browser automation

Adds CLI-first rule, task domain mapping table, and promotes Playwright
CLI to Tier 1 of the global browser automation ladder. Claude-in-Chrome
moves to Tier 2, used only when Playwright CLI is insufficient.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update `agents/screenshot-agent.md`

**Files:**
- Modify: `agents/screenshot-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/screenshot-agent.md`. Current Step 1 has Tier 1=Claude-in-Chrome, Tier 2=computer-use, Tier 3=skip.

- [ ] **Step 2: Replace Step 1**

Replace the entire Step 1 block (from `1. Capture full-page screenshot...` through the end of Tier 3) with:

```markdown
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
```

Steps 2, 3, and 4 are unchanged — leave them exactly as they are.

- [ ] **Step 3: Verify the file**

Read `agents/screenshot-agent.md` — confirm:
- Step 1 now has 4 tiers with Playwright CLI as Tier 1
- Steps 2, 3, 4 are unchanged

- [ ] **Step 4: Commit**

```bash
git add agents/screenshot-agent.md
git commit -m "$(cat <<'EOF'
feat: promote Playwright CLI to Tier 1 in screenshot-agent

Claude-in-Chrome moves to Tier 2. Playwright CLI preferred for
full-page screenshots — faster and cheaper than interactive browser.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update `agents/plugin-agent.md`

**Files:**
- Modify: `agents/plugin-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/plugin-agent.md`. Steps 1b and 1c currently have a `Browser automation (3-tier ladder)` as step 3 inside each, with Claude-in-Chrome first.

- [ ] **Step 2: Replace the browser automation sub-steps in 1b and 1c**

In Step 1b (Install), find:
```
      3. Browser automation (3-tier ladder):
         - Claude-in-Chrome: navigate to WP Admin → Plugins → Add New → search slug → Install → Activate
         - computer-use: same path via screenshot-guided interaction
         - If all three fail: log `status: failed, reason: install_all_methods_exhausted`
```

Replace with:
```
      3. Browser automation (4-tier ladder):
         - Playwright CLI: `npx playwright evaluate --browser=chromium <wp_admin_url>/plugin-install.php "document.title"` to verify WP Admin is reachable; if reachable, fall through to Claude-in-Chrome for UI interaction
         - Claude-in-Chrome: navigate to WP Admin → Plugins → Add New → search slug → Install → Activate
         - computer-use: same path via screenshot-guided interaction
         - If all four fail: log `status: failed, reason: install_all_methods_exhausted`
```

In Step 1c (Configure), find:
```
      3. Browser automation (3-tier ladder):
         - Claude-in-Chrome: navigate to plugin settings page in WP Admin → apply config
         - computer-use: same path via screenshot-guided interaction
         - If all three fail: log `status: configured_partial` with details of what was applied
```

Replace with:
```
      3. Browser automation (4-tier ladder):
         - Playwright CLI: `npx playwright evaluate --browser=chromium <plugin_settings_url> "document.title"` to verify settings page is reachable; if reachable, fall through to Claude-in-Chrome for UI interaction
         - Claude-in-Chrome: navigate to plugin settings page in WP Admin → apply config
         - computer-use: same path via screenshot-guided interaction
         - If all four fail: log `status: configured_partial` with details of what was applied
```

- [ ] **Step 3: Verify the file**

Read `agents/plugin-agent.md` — confirm both 1b and 1c now show `(4-tier ladder)` and include the Playwright CLI availability check step. Steps 2 and 3 (site health check and return) are unchanged.

- [ ] **Step 4: Commit**

```bash
git add agents/plugin-agent.md
git commit -m "$(cat <<'EOF'
feat: add Playwright CLI as Tier 1 of browser automation in plugin-agent

Playwright CLI checks WP Admin reachability before handing off to
Claude-in-Chrome for interactive install/configure. Follows 4-tier ladder.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `agents/provider-agent.md`

**Files:**
- Modify: `agents/provider-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/provider-agent.md`. Two sections use browser automation:
1. **CDN configuration** — currently `Tier 1: Claude-in-Chrome; Tier 2: computer-use`
2. **Hosting panel UI tasks** — currently `3-tier browser automation ladder (Claude-in-Chrome → computer-use → user prompt)`

- [ ] **Step 2: Update the CDN configuration section**

Find:
```markdown
   - Tier 1: Claude-in-Chrome; Tier 2: computer-use
   - Tier 3 (user prompt): ONLY if dashboard requires sign-in —
     ask for credentials, then complete configuration autonomously after auth
```

Replace with:
```markdown
   - Tier 1: Playwright CLI — `npx playwright screenshot --browser=chromium <cdn_dashboard_url> /tmp/.wow/cdn-check.png` to verify dashboard loads; if accessible without auth, use `evaluate` to apply settings via JS where possible
   - Tier 2: Claude-in-Chrome — navigate and interact with CDN dashboard UI
   - Tier 3: computer-use — screenshot-guided interaction
   - Tier 4 (user prompt): ONLY if dashboard requires sign-in — ask for credentials, then complete configuration autonomously after auth
```

- [ ] **Step 3: Update the Hosting panel UI tasks section**

Find:
```markdown
   - Use 3-tier browser automation ladder (Claude-in-Chrome → computer-use →
     user prompt for credentials only)
```

Replace with:
```markdown
   - Use 4-tier browser automation ladder (Playwright CLI → Claude-in-Chrome → computer-use →
     user prompt for credentials only)
```

- [ ] **Step 4: Verify the file**

Read `agents/provider-agent.md` — confirm both browser automation references now use 4-tier language with Playwright CLI first. Step 3 (return actions.json) is unchanged.

- [ ] **Step 5: Commit**

```bash
git add agents/provider-agent.md
git commit -m "$(cat <<'EOF'
feat: add Playwright CLI as Tier 1 of browser automation in provider-agent

CDN configuration and hosting panel tasks now try Playwright CLI before
Claude-in-Chrome. Follows global 4-tier browser automation ladder.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update `agents/custom-agent.md`

**Files:**
- Modify: `agents/custom-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/custom-agent.md`. The `When SSH is unavailable — browser automation path` section currently says `3-tier browser automation ladder (Claude-in-Chrome → computer-use → user prompt for credentials only)`.

- [ ] **Step 2: Update the browser automation ladder reference**

Find:
```markdown
   - Use 3-tier browser automation ladder (Claude-in-Chrome → computer-use →
     user prompt for credentials only)
```

Replace with:
```markdown
   - Use 4-tier browser automation ladder (Playwright CLI → Claude-in-Chrome → computer-use →
     user prompt for credentials only)
   - Playwright CLI: use `npx playwright evaluate --browser=chromium <wp_admin_url> "<js>"` to apply settings via JS where possible before falling through to Claude-in-Chrome
```

- [ ] **Step 3: Verify the file**

Read `agents/custom-agent.md` — confirm the SSH-unavailable section now references the 4-tier ladder with Playwright CLI. All other steps and safety rules are unchanged.

- [ ] **Step 4: Commit**

```bash
git add agents/custom-agent.md
git commit -m "$(cat <<'EOF'
feat: add Playwright CLI as Tier 1 of browser automation in custom-agent

Browser path when SSH unavailable now tries Playwright CLI evaluate
before Claude-in-Chrome. Follows global 4-tier browser automation ladder.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update `agents/providers/hostinger-agent.md`

**Files:**
- Modify: `agents/providers/hostinger-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/providers/hostinger-agent.md`. Section 4 (`hPanel UI tasks`) has a 3-tier ladder with Claude-in-Chrome as Tier 1. The header also describes a 3-tier ladder.

- [ ] **Step 2: Update the header description**

Find:
```markdown
**Browser automation ladder (for hPanel UI tasks):**
- Tier 1: Claude-in-Chrome MCP (`mcp__Claude_in_Chrome__*`)
- Tier 2: computer-use MCP (`mcp__computer-use__*`)
- Tier 3: structured user prompt with exact hPanel path
```

Replace with:
```markdown
**Browser automation ladder (for hPanel UI tasks — 4 tiers):**
- Tier 1: Playwright CLI (`npx playwright screenshot/evaluate`)
- Tier 2: Claude-in-Chrome MCP (`mcp__Claude_in_Chrome__*`)
- Tier 3: computer-use MCP (`mcp__computer-use__*`)
- Tier 4: structured user prompt with exact hPanel path
```

- [ ] **Step 3: Update Section 4 — hPanel UI tasks ladder**

In the `For each task:` block, insert a new Tier 1 before the current Tier 1, and renumber existing tiers:

Replace:
```markdown
**Tier 1 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate to hPanel URL, click through UI steps to complete the task
- Log: `{ "method": "claude-in-chrome", "status": "done" }`
- If the tool call raises an error or returns a failure, fall through to the next tier.

**Tier 2 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: take screenshot, locate hPanel UI, click to complete task
- Log: `{ "method": "computer-use", "status": "done" }`
- If the tool call raises an error or returns a failure, fall through to the next tier.

**Tier 3 — user prompt:**
- Emit structured request:
  ```
  ACTION REQUIRED: [task name]
  Navigate to: hPanel → [exact path]
  Goal: [what to enable/set]
  After completing, type "done" to continue.
  ```
- Log: `{ "method": "user_prompt", "status": "user_action_required" }`
```

With:
```markdown
**Tier 1 — Playwright CLI:**
- Check availability: `npx playwright --version >/dev/null 2>&1`
- If available: `npx playwright screenshot --browser=chromium <hpanel_url> /tmp/.wow/hpanel-check.png`
  to verify hPanel loads; if the page requires login or bot detection blocks headless: fall through to Tier 2
- Log: `{ "method": "playwright-cli", "status": "done|fallthrough" }`
- If command exits non-zero or Playwright not found: fall through to Tier 2

**Tier 2 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate to hPanel URL, click through UI steps to complete the task
- Log: `{ "method": "claude-in-chrome", "status": "done" }`
- If the tool call raises an error or returns a failure, fall through to Tier 3.

**Tier 3 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: take screenshot, locate hPanel UI, click to complete task
- Log: `{ "method": "computer-use", "status": "done" }`
- If the tool call raises an error or returns a failure, fall through to Tier 4.

**Tier 4 — user prompt:**
- Emit structured request:
  ```
  ACTION REQUIRED: [task name]
  Navigate to: hPanel → [exact path]
  Goal: [what to enable/set]
  After completing, type "done" to continue.
  ```
- Log: `{ "method": "user_prompt", "status": "user_action_required" }`
```

- [ ] **Step 4: Verify the file**

Read `agents/providers/hostinger-agent.md` — confirm:
- Header shows 4-tier ladder
- Section 4 has Playwright CLI as Tier 1, Claude-in-Chrome as Tier 2, computer-use as Tier 3, user prompt as Tier 4
- Steps 1, 2, 3, 5 are unchanged

- [ ] **Step 5: Commit**

```bash
git add agents/providers/hostinger-agent.md
git commit -m "$(cat <<'EOF'
feat: promote Playwright CLI to Tier 1 of hPanel automation in hostinger-agent

hPanel tasks now try Playwright CLI before Claude-in-Chrome. Playwright
falls through immediately if hPanel requires login or bot detection blocks
headless. Follows global 4-tier browser automation ladder.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Run validation script

**Files:**
- Read: `scripts/validate-plugin.sh`

- [ ] **Step 1: Run validation**

`scripts/validate-plugin.sh` is a pre-existing script in the repo. Confirm it exists first:
```bash
ls scripts/validate-plugin.sh
```

If it exists, run it:
```bash
bash scripts/validate-plugin.sh
```
Expected: all existing checks pass. Fix any failures before proceeding.

If the script does not exist, skip this step and proceed to Step 2.

- [ ] **Step 2: Verify key changes manually**

```bash
jq '.mcp_servers | keys' wow-manifest.json
```
Expected: `["lighthouse"]` (browser and wp-cli removed)

```bash
jq '.cli_tools' wow-manifest.json
```
Expected: object with `browser_automation` and `wp_management` keys

```bash
jq '.browser_automation | keys' wow-manifest.json
```
Expected: `["_note", "tier1", "tier2", "tier3", "tier4"]`

```bash
grep "Playwright CLI" scripts/install.sh
```
Expected: line found

```bash
grep "4-tier" skills/wow/SKILL.md
```
Expected: line found in section 1b

```bash
grep "Playwright CLI" agents/screenshot-agent.md agents/plugin-agent.md agents/provider-agent.md agents/custom-agent.md agents/providers/hostinger-agent.md
```
Expected: at least one match per file

- [ ] **Step 3: Commit only if validation required fixes**

Only commit if fixes were needed.
