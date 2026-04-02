# WOW Hostinger Provider Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hostinger-specific provider agent that replaces the generic `provider-agent.md` when Hostinger is detected, using `wordpress-manager` for WP optimization, `hostinger-agent-skills` for VPS-tier server ops, and a 3-tier browser automation ladder (Claude-in-Chrome → computer-use → user prompt) for hPanel UI tasks.

**Architecture:** One new agent file (`agents/providers/hostinger-agent.md`) handles all Hostinger-specific optimization. Four existing files are updated: manifest gains provider skill registry, inventory-agent gains `plan_tier` detection, wow-execute routes provider dispatch by `hosting_provider`, and install.sh adds the two Hostinger plugin install commands. No new bash hooks or JSON state files — hostinger-agent writes into the existing `actions.json` schema.

**Tech Stack:** Claude Code markdown skills, Claude-in-Chrome MCP, computer-use MCP, hostinger/hostinger-agent-skills, morrealev/wordpress-manager, JSON state files in `/tmp/.wow/`.

**Spec:** `docs/superpowers/specs/2026-04-02-wow-hostinger-provider.md`

---

## File Map

| File | Type | Change |
|---|---|---|
| `agents/providers/hostinger-agent.md` | Markdown | **Create** — Hostinger provider agent |
| `wow-manifest.json` | JSON | **Modify** — add `provider_skills` + `browser_automation` sections |
| `agents/inventory-agent.md` | Markdown | **Modify** — add `plan_tier` detection + output field |
| `skills/wow-execute/SKILL.md` | Markdown | **Modify** — route provider dispatch on `hosting_provider` |
| `scripts/install.sh` | Bash | **Modify** — add hostinger plugin install commands |

---

## Task 1: Create `agents/providers/` directory and write `hostinger-agent.md`

**Files:**
- Create: `agents/providers/hostinger-agent.md`

- [ ] **Step 1: Create the providers subdirectory and write the agent file**

Create `agents/providers/hostinger-agent.md`:

```markdown
# Hostinger Provider Agent

## Role

Apply Hostinger-specific hosting-level optimizations when `hosting_provider == "hostinger"`
in inventory.json. Uses two community plugins as primary tools and a 3-tier browser
automation ladder for hPanel UI tasks.

**Primary tools:**
- `morrealev/wordpress-manager` — Hostinger MCP + WP REST bridge + performance agents
- `hostinger/hostinger-agent-skills` — VPS management, SSH keys, snapshots, metrics (VPS tier only)

**Browser automation ladder (for hPanel UI tasks):**
- Tier 1: Claude-in-Chrome MCP (`mcp__Claude_in_Chrome__*`)
- Tier 2: computer-use MCP (`mcp__computer-use__*`)
- Tier 3: structured user prompt with exact hPanel path

## Steps

### 1. Read context

Read `/tmp/.wow/iterations/N/inventory.json`.
Extract: `plan_tier` (shared|cloud|vps), `litespeed_present`, `object_cache_present`.

### 2. Always — invoke wordpress-manager

Use `morrealev/wordpress-manager` to:
- Establish WP REST bridge to target site (use WP credentials from session context)
- Run the performance optimization pass (caching, assets, DB cleanup)
- Capture returned action list + per-action status

If wordpress-manager is not installed or unavailable:
- Log: `{ "action": "wordpress-manager", "status": "skipped", "reason": "not_installed" }`
- Fall back: notify orchestrator to use generic `provider-agent.md` instead
- Stop; do not continue this agent

### 3. VPS tier only — invoke hostinger-agent-skills

Skip this section entirely if `plan_tier != "vps"`.

Use `hostinger/hostinger-agent-skills` to:
1. **Snapshot**: Take VPS snapshot before any server changes
   - If snapshot fails: log warning, continue (do not abort)
2. **SSH key**: Verify SSH key access exists; register key if missing
3. **Metrics**: Capture server metrics (CPU/RAM) — baseline before optimization
4. **Firewall review**: List open ports; flag any non-standard open ports as advisory

If hostinger-agent-skills is not installed:
- Log: `{ "action": "vps-ops", "status": "skipped", "reason": "hostinger-agent-skills_not_installed" }`
- Continue without VPS block

### 4. hPanel UI tasks — 3-tier automation ladder

Run the following hPanel tasks. For each, attempt tiers in order until one succeeds.

**Tasks:**
- Enable Hostinger CDN (if `cdn_detected == false`)
  - hPanel path: Sites → [your site] → CDN → Enable
- Enable Redis object cache (if `object_cache_present == false` and plan supports it)
  - hPanel path: Hosting → Advanced → Redis → Enable
- Set PHP version to latest stable (if `php_version` is < 8.2)
  - hPanel path: Hosting → PHP Configuration → PHP Version
- Force HTTPS (if `really-simple-ssl` not in plugins list)
  - hPanel path: Hosting → SSL → Force HTTPS

**For each task:**

**Tier 1 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate to hPanel URL, click through UI steps to complete the task
- Log: `{ "method": "claude-in-chrome", "status": "done" }`

**Tier 2 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: take screenshot, locate hPanel UI, click to complete task
- Log: `{ "method": "computer-use", "status": "done" }`

**Tier 3 — user prompt:**
- Emit structured request:
  ```
  ACTION REQUIRED: [task name]
  Navigate to: hPanel → [exact path]
  Goal: [what to enable/set]
  After completing, type "done" to continue.
  ```
- Log: `{ "method": "user_prompt", "status": "user_action_required" }`

### 5. Write output

Write actions.json fragment to `/tmp/.wow/iterations/N/hostinger-actions.json`:

```json
{
  "agent": "hostinger-agent",
  "tier": "shared|cloud|vps",
  "actions": [
    {
      "action": "wordpress-manager optimization pass",
      "domain": "provider",
      "status": "done|failed|skipped",
      "method": "wordpress-manager",
      "notes": ""
    }
  ]
}
```

Status values: `"done"` | `"failed"` | `"skipped"` | `"user_action_required"`
```

- [ ] **Step 2: Verify file was created**

```bash
ls agents/providers/hostinger-agent.md
```
Expected: file exists with no errors.

- [ ] **Step 3: Commit**

```bash
git add agents/providers/hostinger-agent.md
git commit -m "$(cat <<'EOF'
feat: add Hostinger provider agent

Uses wordpress-manager (primary) + hostinger-agent-skills (VPS tier)
+ 3-tier browser automation ladder for hPanel UI tasks.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Update `wow-manifest.json`

**Files:**
- Modify: `wow-manifest.json`

- [ ] **Step 1: Add `provider_skills` and `browser_automation` sections**

Current `wow-manifest.json` has: `skills`, `mcp_servers`, `wp_plugins_on_target_site`, `discovery`.

Add two new top-level keys after `mcp_servers`:

```json
"provider_skills": {
  "_note": "Provider-specific skills keyed by hosting_provider value from inventory.json",
  "hostinger": [
    "hostinger/hostinger-agent-skills",
    "morrealev/wordpress-manager"
  ]
},
"browser_automation": {
  "_note": "3-tier ladder for tasks requiring UI interaction (e.g. hPanel). Primary → fallback → last_resort.",
  "primary": "Claude-in-Chrome",
  "fallback": "computer-use",
  "last_resort": "user_prompt"
},
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
feat: add provider_skills and browser_automation to wow-manifest

Registers hostinger-agent-skills + wordpress-manager as Hostinger
provider skills; documents 3-tier browser automation ladder.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `agents/inventory-agent.md`

**Files:**
- Modify: `agents/inventory-agent.md`

- [ ] **Step 1: Add `plan_tier` detection logic**

In Step 4 (detect hosting provider), add Hostinger plan tier detection after the existing provider detection logic:

```markdown
4b. If `hosting_provider == "hostinger"`, detect plan tier:
    - VPS indicators: response headers `X-Hostinger-VPS: 1`, PTR record matching
      `vps*.hostinger.com`, or IP range `31.170.160.0/20`
    - Cloud/Business indicators: `X-Hostinger-Plan` header containing "business"
      or "cloud", or subdomain `*.hostinger.website`
    - Default: `shared`
    - If `hosting_provider != "hostinger"`: omit `plan_tier` or set to `""` (empty string)
```

- [ ] **Step 2: Add `plan_tier` to output schema**

The current output JSON schema in Step 5 lacks `plan_tier`. Add it:

```json
{
  "plugins": [],
  "active_theme": "",
  "php_version": "",
  "web_server": "",
  "hosting_provider": "",
  "plan_tier": "shared|cloud|vps|n/a",
  "cdn_detected": false,
  "litespeed_present": false,
  "object_cache_present": false
}
```

- [ ] **Step 3: Verify edit looks correct**

Read `agents/inventory-agent.md` and confirm both additions appear without breaking
existing steps 1–5 structure.

- [ ] **Step 4: Commit**

```bash
git add agents/inventory-agent.md
git commit -m "$(cat <<'EOF'
feat: add plan_tier detection to inventory agent

Detects Hostinger plan tier (shared/cloud/vps) from headers and IP
ranges; emits plan_tier field in inventory.json.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update `skills/wow-execute/SKILL.md`

**Files:**
- Modify: `skills/wow-execute/SKILL.md`

- [ ] **Step 1: Update the provider dispatch in Step 2**

Current Step 2 dispatches `provider-agent` unconditionally. Replace the
`provider-agent` dispatch line with conditional routing:

```markdown
- **provider-agent**:
  - Read `inventory.json` → check `hosting_provider`
  - If `hosting_provider == "hostinger"`:
    → Read `agents/providers/hostinger-agent.md`
  - Else:
    → Read `agents/provider-agent.md`
  - Pass: provider-domain actions, SSH/hosting credentials from session context,
    site URL, full inventory from audit.json.
```

- [ ] **Step 2: Update Step 4 (merge) to include hostinger-actions.json**

The current merge step reads agent reports. Update to handle the Hostinger
agent's separate output file:

```markdown
### 4. Save executed actions

Merge agent reports into `/tmp/.wow/iterations/N/actions.json`.

If Hostinger agent was dispatched, also merge
`/tmp/.wow/iterations/N/hostinger-actions.json` into the `applied` array.
```

- [ ] **Step 3: Verify the edit looks correct**

Read `skills/wow-execute/SKILL.md` and confirm the routing logic is clean and
the rest of the steps are unchanged.

- [ ] **Step 4: Commit**

```bash
git add skills/wow-execute/SKILL.md
git commit -m "$(cat <<'EOF'
feat: route wow-execute provider dispatch by hosting_provider

Dispatches hostinger-agent when hosting_provider == hostinger,
generic provider-agent otherwise. Merges hostinger-actions.json
into final actions.json.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update `scripts/install.sh`

**Files:**
- Modify: `scripts/install.sh`

- [ ] **Step 1: Add Hostinger plugin install section**

After the existing `--- Installing community skills ---` block and before the
`--- Installing MCP servers ---` block, add:

```bash
echo ""
echo "--- Installing Hostinger provider skills (optional — only needed for Hostinger sites) ---"

/plugin install hostinger/hostinger-agent-skills \
  && echo "  ✓ hostinger-agent-skills" || echo "  ⚠ hostinger-agent-skills install failed (non-fatal — only needed for Hostinger sites)"

/plugin install morrealev/wordpress-manager \
  && echo "  ✓ wordpress-manager" || echo "  ⚠ wordpress-manager install failed (non-fatal — only needed for Hostinger sites)"
```

- [ ] **Step 2: Verify the script is still valid bash**

```bash
bash -n scripts/install.sh && echo "syntax ok" || echo "syntax error"
```
Expected: `syntax ok`

- [ ] **Step 3: Commit**

```bash
git add scripts/install.sh
git commit -m "$(cat <<'EOF'
feat: add Hostinger provider skill install commands to install.sh

Installs hostinger-agent-skills and wordpress-manager as optional
dependencies for Hostinger-hosted WordPress sites.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Run validation script

**Files:**
- Read: `scripts/validate-plugin.sh`

- [ ] **Step 1: Run the existing validation script**

```bash
bash scripts/validate-plugin.sh
```

Expected: all existing checks pass. The script checks JSON validity,
plugin structure, and file presence. Fix any failures before proceeding.

- [ ] **Step 2: Confirm new files are reachable**

```bash
ls agents/providers/hostinger-agent.md
jq '.provider_skills.hostinger | length' wow-manifest.json
jq '.browser_automation.primary' wow-manifest.json
```

Expected: file exists; `provider_skills.hostinger` length is `2`; `browser_automation.primary` is `"Claude-in-Chrome"`.

- [ ] **Step 3: Final commit if any validation fixes were needed**

Only commit if validation required fixes. Otherwise skip this step.
