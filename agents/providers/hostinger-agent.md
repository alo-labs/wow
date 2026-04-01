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
Extract: `plan_tier` (shared|cloud|vps), `litespeed_present`, `object_cache_present`, `cdn_detected`.

If `plan_tier` is absent (inventory-agent not yet updated), default to `shared`.

### 2. Always — invoke wordpress-manager

Use `morrealev/wordpress-manager` to:
- Establish WP REST bridge to target site (use WP credentials from session context)
- Run the performance optimization pass (caching, assets, DB cleanup)
- Capture returned action list + per-action status
- Note: wordpress-manager handles LiteSpeed Cache configuration if `litespeed_present == true`

If wordpress-manager is not installed or unavailable:
- Log: `{ "action": "wordpress-manager", "status": "skipped", "reason": "not_installed" }`
- Write `{ "agent": "hostinger-agent", "status": "aborted", "reason": "wordpress-manager not installed" }` to `/tmp/.wow/iterations/N/hostinger-actions.json` and stop.

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

If a tool call raises an error or returns a failure, log the error and continue to Step 4.

### 4. hPanel UI tasks — 3-tier automation ladder

Run the following hPanel tasks. For each, attempt tiers in order until one succeeds.

**Tasks:**
- Enable Hostinger CDN (if `cdn_detected == false`)
  - hPanel path: Sites → [your site] → CDN → Enable
- Enable Redis object cache (if `object_cache_present == false` and (`plan_tier == "cloud"` or `plan_tier == "vps"`))
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

### 5. Write output

Note: `N` is the current iteration number from session context (see `/tmp/.wow/iterations/` — use the current iteration directory).

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
      "hpanel_path": "",
      "_note": "hpanel_path is empty string for non-UI actions",
      "notes": ""
    },
    {
      "action": "Enable Hostinger CDN",
      "domain": "provider",
      "status": "done|user_action_required",
      "method": "claude-in-chrome|computer-use|user_prompt",
      "hpanel_path": "Sites → CDN → Enable",
      "notes": ""
    }
  ]
}
```

Status values: `"done"` | `"failed"` | `"skipped"` | `"user_action_required"` | `"aborted"`
