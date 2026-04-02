# WOW Global Browser Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote Claude-in-Chrome from a Hostinger-specific fallback to a first-class tool used across the entire WOW agent system — for visual checks, plugin/hosting UI tasks, and any gap that CLIs or APIs can't close — while restricting human prompts to credential entry and sign-in only.

**Architecture:** Six targeted edits to existing markdown agent/skill files. No new files, no new state, no new hooks. Each agent gets a consistent 3-tier automation ladder (Claude-in-Chrome → computer-use → user prompt for credentials only). The orchestrator skill gets a global policy section. The manifest note is updated to reflect global scope.

**Tech Stack:** Claude Code markdown skills, Claude-in-Chrome MCP (`mcp__Claude_in_Chrome__*`), computer-use MCP (`mcp__computer-use__*`).

**Spec:** `docs/superpowers/specs/2026-04-02-wow-global-browser-automation.md`

---

## File Map

| File | Change |
|---|---|
| `agents/screenshot-agent.md` | Use Claude-in-Chrome as primary; add visual health check; remove PENDING fallback |
| `agents/plugin-agent.md` | Add browser automation as third install/configure option after WP-CLI + REST fail |
| `agents/provider-agent.md` | Replace Cloudflare advisory with browser action; add generic hosting panel browser steps |
| `agents/custom-agent.md` | Add browser automation for UI-required fixes when SSH unavailable |
| `skills/wow/SKILL.md` | Add global browser automation policy section after Step 1 |
| `wow-manifest.json` | Update `browser_automation._note` to reflect global scope |

---

## Reusable ladder snippet (reference for all tasks)

Every agent that gains browser automation uses this exact 3-tier pattern. Include it verbatim:

```markdown
**Browser automation ladder (3 tiers — use for any UI task or visual check):**

**Tier 1 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate, click, fill, capture — complete the task
- If tool call raises error or returns failure: fall through to Tier 2

**Tier 2 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: screenshot, locate UI, interact to complete the task
- If tool call raises error or returns failure: fall through to Tier 3

**Tier 3 — user prompt (credentials and sign-in ONLY):**
- Ask the human ONLY for: passwords, API keys, tokens, or authentication steps
- NEVER ask the human to click, navigate, or configure — only for credentials
```

---

## Task 1: Update `agents/screenshot-agent.md`

**Files:**
- Modify: `agents/screenshot-agent.md`

- [ ] **Step 1: Replace the agent content**

Read the current file first. Then replace Steps 1 and 4 with the updated version below.
Keep Step 2 (save path) and Step 3 (output JSON) unchanged.

Replace Step 1:
```markdown
1. Capture full-page screenshot using the browser automation ladder:

   **Tier 1 — Claude-in-Chrome:**
   - Check: is `mcp__Claude_in_Chrome__navigate` callable?
   - If yes: navigate to `<site_url>`, wait for page load, capture full-page screenshot
   - If tool call raises error or returns failure: fall through to Tier 2

   **Tier 2 — computer-use:**
   - Check: is `mcp__computer-use__screenshot` callable?
   - If yes: take screenshot of the rendered page
   - If tool call raises error or returns failure: fall through to Tier 3

   **Tier 3 — skip gracefully:**
   - Screenshot is non-blocking. Log: `{ "status": "skipped", "reason": "no_browser_tool_available" }`
   - Continue without screenshot — do NOT ask the human
```

Replace Step 4 (the current PENDING fallback) with:
```markdown
4. After capturing, perform a basic visual health check:
   - Confirm the page is rendering (not a blank page or fatal error screen)
   - If error detected: log `{ "visual_health": "error_detected", "note": "<description>" }`
   - If healthy: log `{ "visual_health": "ok" }`
   Add `visual_health` field to the output JSON in Step 3.
```

- [ ] **Step 2: Verify the file looks correct — steps 2 and 3 are unchanged, steps 1 and 4 are updated**

Read `agents/screenshot-agent.md` and confirm structure.

- [ ] **Step 3: Commit**

```bash
git add agents/screenshot-agent.md
git commit -m "$(cat <<'EOF'
feat: use Claude-in-Chrome for screenshots + visual health check

Replaces vague browser MCP reference with explicit 3-tier ladder.
Adds basic visual health check after capture.
Removes PENDING fallback — screenshot always attempted.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `agents/plugin-agent.md`

**Files:**
- Modify: `agents/plugin-agent.md`

- [ ] **Step 1: Add browser automation as third install/configure path**

In Step 1b (Install) and 1c (Configure), after the existing WP-CLI and REST API
options, add a browser automation fallback. Replace the current Step 1b and 1c:

```markdown
   b. **Install**: Try in order until one succeeds:
      1. WP-CLI: `wp plugin install <slug> --activate`
      2. WP REST API: `POST /wp-json/wp/v2/plugins` with slug and status: active
      3. Browser automation (3-tier ladder):
         - Claude-in-Chrome: navigate to WP Admin → Plugins → Add New → search slug → Install → Activate
         - computer-use: same path via screenshot-guided interaction
         - If all three fail: log `status: failed, reason: install_all_methods_exhausted`

   c. **Configure**: Apply recommended settings. Try in order:
      1. WP-CLI: `wp option update <key> <value>` or plugin-specific CLI command
      2. WP REST API: plugin-specific settings endpoint if available
      3. Browser automation (3-tier ladder):
         - Claude-in-Chrome: navigate to plugin settings page in WP Admin → apply config
         - computer-use: same path via screenshot-guided interaction
         - If all three fail: log `status: configured_partial` with details of what was applied
```

- [ ] **Step 2: Update the final constraint in the Constraints section**

Find:
```
- If WP-CLI and REST API both fail, report as `status: failed` — do not guess
```

Replace with:
```
- If WP-CLI, REST API, and browser automation all fail, report as `status: failed` — do not guess
- Never ask the human to install or configure a plugin manually — exhaust all three methods first
```

- [ ] **Step 3: Verify the file looks correct**

Read `agents/plugin-agent.md` and confirm Steps 1b, 1c, and Constraints are updated.
Verify Steps 2 and 3 (site health check and return) are unchanged.

- [ ] **Step 4: Commit**

```bash
git add agents/plugin-agent.md
git commit -m "$(cat <<'EOF'
feat: add browser automation as third install/configure path in plugin-agent

WP-CLI → REST API → Claude-in-Chrome/computer-use before reporting
failure. Never asks human to install or configure plugins manually.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `agents/provider-agent.md`

**Files:**
- Modify: `agents/provider-agent.md`

- [ ] **Step 1: Replace the CDN advisory with a browser action**

Find the current CDN detection block:
```markdown
   **CDN detection**:
   - If Cloudflare detected: recommend enabling Auto Minify and Rocket Loader
     (advise user — cannot configure via API without Cloudflare credentials)
```

Replace with:
```markdown
   **CDN configuration** (if Cloudflare or other CDN detected):
   - Use browser automation ladder to configure:
     - Cloudflare: navigate to dash.cloudflare.com → Speed → Optimization →
       enable Auto Minify (JS, CSS, HTML) and Rocket Loader
     - Other CDN dashboards: navigate to CDN provider dashboard → enable
       minification, compression, and caching rules
   - Tier 1: Claude-in-Chrome; Tier 2: computer-use
   - Tier 3 (user prompt): ONLY if dashboard requires sign-in —
     ask for credentials, then complete configuration autonomously after auth
```

- [ ] **Step 2: Add a general browser automation section for hosting panel UI tasks**

After the existing SSH-based steps (LiteSpeed, PHP-FPM, server cache headers) and
before Step 3 (return actions.json), add:

```markdown
   **Hosting panel UI tasks** (when SSH is unavailable or insufficient):
   - If hosting panel access is available (cPanel, Plesk, DirectAdmin, or other):
     use browser automation to complete any UI-only optimization task:
     - Enable server-side caching (if not configurable via SSH)
     - Configure PHP version and settings
     - Enable CDN or performance add-ons
   - Use 3-tier browser automation ladder (Claude-in-Chrome → computer-use →
     user prompt for credentials only)
   - Log each action with `method: "claude-in-chrome"`, `"computer-use"`, or `"user_prompt"`
```

- [ ] **Step 3: Verify the file looks correct**

Read `agents/provider-agent.md` — confirm Steps 1 and 2 are updated, Step 3 unchanged.

- [ ] **Step 4: Commit**

```bash
git add agents/provider-agent.md
git commit -m "$(cat <<'EOF'
feat: replace CDN advisory with browser automation in provider-agent

Cloudflare/CDN configuration now automated via Claude-in-Chrome.
Adds hosting panel browser automation for UI-only tasks.
Human prompts limited to credential/sign-in only.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update `agents/custom-agent.md`

**Files:**
- Modify: `agents/custom-agent.md`

- [ ] **Step 1: Add browser automation path for when SSH is unavailable**

After Step 1 (the list of SSH/file-system operations) and before Step 2 (verify
site loads), add a new sub-section:

```markdown
   **When SSH is unavailable — browser automation path:**
   - If SSH access is not available but a fix can be achieved via WP Admin:
     use browser automation to apply it
   - Examples:
     - Enable or configure a caching plugin's advanced settings via WP Admin
     - Set a wp-config-equivalent option via a settings plugin UI
     - Apply a performance toggle that has no CLI equivalent
   - Use 3-tier browser automation ladder (Claude-in-Chrome → computer-use →
     user prompt for credentials only)
   - Do NOT report a fix as failed simply because SSH is unavailable —
     attempt the browser path first
```

- [ ] **Step 2: Update Safety Rules to include browser backup note**

Add one rule:
```markdown
- When using browser automation to modify site settings, note the original
  value in the action log before changing it (enables manual rollback if needed)
```

- [ ] **Step 3: Verify the file looks correct**

Read `agents/custom-agent.md` — confirm new browser section appears, safety rules updated, Steps 2 and 3 unchanged.

- [ ] **Step 4: Commit**

```bash
git add agents/custom-agent.md
git commit -m "$(cat <<'EOF'
feat: add browser automation path to custom-agent when SSH unavailable

Prevents premature failure when SSH is not available but WP Admin
can accomplish the fix. Human prompts for credentials only.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update `skills/wow/SKILL.md`

**Files:**
- Modify: `skills/wow/SKILL.md`

- [ ] **Step 1: Add global browser automation policy section**

After Step 1 (Load community skills) and before Step 2 (Initialize session state),
insert a new section:

```markdown
### 1b. Browser automation policy

Claude-in-Chrome is available as a first-class tool at every phase of the
optimization loop. Any agent — at any point — may invoke it to complete
tasks that skills, CLIs, or APIs cannot accomplish, or to perform visual
checks. No agent should report a task as failed or skip it solely because
a CLI or API is unavailable.

**3-tier automation ladder (applies globally to all agents):**
- Tier 1: Claude-in-Chrome (`mcp__Claude_in_Chrome__*`) — primary
- Tier 2: computer-use (`mcp__computer-use__*`) — fallback
- Tier 3: user prompt — ONLY for credential entry or sign-in

**Human intervention policy:**
The human operating WOW is only asked for:
1. Credentials (passwords, API keys, tokens)
2. Sign-in (when a browser session requires authentication)

The human is NEVER asked to: click buttons, navigate menus, configure
settings, enable features, or perform any action that browser automation
can accomplish. All such tasks must be attempted via Tier 1 and Tier 2
before escalating.

If Claude-in-Chrome is not installed or not signed in, note it but
continue — Tier 2 (computer-use) handles this case. Only escalate to
the user if both tiers are unavailable AND credentials are required.
```

- [ ] **Step 2: Verify the insertion is correct**

Read `skills/wow/SKILL.md` — confirm section 1b appears between step 1 and step 2,
and that all other steps (2 through end) are unchanged.

- [ ] **Step 3: Commit**

```bash
git add skills/wow/SKILL.md
git commit -m "$(cat <<'EOF'
feat: add global browser automation policy to wow orchestrator

Establishes Claude-in-Chrome as first-class tool across all agents.
Documents 3-tier ladder and restricts human prompts to credentials only.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `wow-manifest.json`

**Files:**
- Modify: `wow-manifest.json`

- [ ] **Step 1: Update `browser_automation._note`**

Find:
```json
"_note": "3-tier ladder for tasks requiring UI interaction (e.g. hPanel). Primary → fallback → last_resort.",
```

Replace with:
```json
"_note": "Global 3-tier browser automation ladder — applies to all agents. Use for any UI task, visual check, or gap that CLIs/APIs cannot close. Human prompts reserved for credential entry and sign-in only.",
```

- [ ] **Step 2: Validate JSON**

```bash
jq empty wow-manifest.json && echo "valid" || echo "invalid JSON"
```
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add wow-manifest.json
git commit -m "$(cat <<'EOF'
docs: update browser_automation note to reflect global scope

Was Hostinger-scoped; now documents global policy for all agents.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Run validation script

**Files:**
- Read: `scripts/validate-plugin.sh`

- [ ] **Step 1: Run the validation script**

```bash
bash scripts/validate-plugin.sh
```

Expected: all 53 checks pass. Fix any failures before proceeding.

- [ ] **Step 2: Commit only if fixes were required**

Only commit if the validation script revealed issues requiring changes.
