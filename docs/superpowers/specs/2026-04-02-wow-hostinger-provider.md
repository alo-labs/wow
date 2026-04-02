# WOW — Hostinger Provider Module Design

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alo-labs/wow
**Date**: 2026-04-02
**Sub-project**: 2 of N — Hostinger Provider Module

---

## Overview

The Hostinger provider module replaces the generic `provider-agent.md` when the
inventory phase detects `hosting_provider == "hostinger"`. It uses two purpose-built
community plugins:

- **hostinger/hostinger-agent-skills** — Official Hostinger API: VPS management,
  SSH keys, snapshots, metrics, DNS, domains, billing (MIT)
- **morrealev/wordpress-manager** — Hostinger MCP + WP REST bridge + performance
  agents; purpose-built for Hostinger + WordPress integration

For tasks only achievable through hPanel UI (CDN, Redis, PHP version), the agent
follows a 3-tier browser automation ladder before falling back to user instruction.

---

## Dependencies

Both must be listed in `wow-manifest.json` under `provider_skills.hostinger`:

```json
"provider_skills": {
  "hostinger": [
    "hostinger/hostinger-agent-skills",
    "morrealev/wordpress-manager"
  ]
},
"browser_automation": {
  "primary": "Claude-in-Chrome",
  "fallback": "computer-use",
  "last_resort": "user_prompt"
}
```

Install command (added to `scripts/install.sh`):

```bash
/plugin install hostinger/hostinger-agent-skills
/plugin install morrealev/wordpress-manager
```

---

## Architecture

### Approach: wordpress-manager primary, hostinger-agent-skills for VPS tier only

`wordpress-manager` was purpose-built for Hostinger + WP integration — it handles
the full WP optimization pass via Hostinger MCP bridge. `hostinger-agent-skills`
adds genuine value only when the VPS plan tier is detected (snapshot safety,
SSH key management, server-level metrics).

### Routing

`wow-execute` routes the provider domain to `hostinger-agent.md` instead of
`provider-agent.md` when `inventory.json` contains `hosting_provider: "hostinger"`.

---

## Plan Tier Detection

`inventory-agent.md` must detect and emit a `plan_tier` field in addition to
`hosting_provider`. Hostinger plan tiers:

| Signal | Tier |
|---|---|
| VPS-specific headers or IP range | `vps` |
| Hostinger Business/Cloud indicators | `cloud` |
| Default Hostinger shared | `shared` |

Updated inventory.json schema:

```json
{
  "plugins": [],
  "active_theme": "",
  "php_version": "",
  "web_server": "",
  "hosting_provider": "hostinger",
  "plan_tier": "shared|cloud|vps",
  "cdn_detected": false,
  "litespeed_present": false,
  "object_cache_present": false
}
```

---

## Agent Behavior

### 1. Read context

Read `inventory.json` → extract `plan_tier`, `litespeed_present`, `object_cache_present`.

### 2. Always — invoke wordpress-manager

Use `morrealev/wordpress-manager` to:
- Establish WP REST bridge connection to target site
- Run performance optimization pass (caching, assets, DB)
- Return: list of actions taken + status per action

### 3. VPS tier only — invoke hostinger-agent-skills

Use `hostinger/hostinger-agent-skills` to:
1. Take VPS snapshot (safety checkpoint before any server changes)
2. Verify SSH key access exists; register if missing
3. Run post-optimization server metrics (CPU/RAM before vs after)
4. Flag open non-standard firewall ports as advisory

### 4. hPanel UI tasks — 3-tier automation ladder

For tasks that cannot be done via API or CLI (CDN activation, Redis enable,
PHP version selection):

**Tier 1 — Claude-in-Chrome** (primary):
- Check if Claude-in-Chrome MCP is live (`mcp__Claude_in_Chrome__*` available)
- If yes: navigate to hPanel, interact with UI to complete the task
- Log each action: `{ "method": "claude-in-chrome", "status": "done" }`

**Tier 2 — computer-use** (fallback):
- If Claude-in-Chrome not available: use `mcp__computer-use__*` tools
- Take screenshot to locate UI, click through hPanel to complete task
- Log: `{ "method": "computer-use", "status": "done" }`

**Tier 3 — user prompt** (last resort):
- If neither browser automation is available:
- Emit a structured user-action request with:
  - Exact hPanel navigation path
  - Screenshot of target UI element (if available from prior screenshot-agent)
  - Expected outcome
- Log: `{ "method": "user_prompt", "status": "user_action_required" }`

hPanel UI tasks covered by this ladder:

| Task | hPanel Path |
|---|---|
| Enable CDN | Sites → your site → CDN → Enable |
| Enable Redis object cache | Hosting → Advanced → Redis → Enable |
| Set PHP version | Hosting → PHP Configuration → PHP Version |
| Enable HTTPS / Force SSL | Hosting → SSL → Force HTTPS |

### 5. Output

Write actions.json fragment:

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

---

## Graceful Degradation

| Condition | Behavior |
|---|---|
| `wordpress-manager` not installed | Fall back to `provider-agent.md` (generic); log warning |
| `hostinger-agent-skills` not installed | Skip VPS steps; continue without snapshot/metrics |
| No SSH access (shared plan) | Skip VPS block entirely; wordpress-manager handles WP layer |
| All browser automation unavailable | Emit user-action prompts for all hPanel tasks |
| VPS snapshot fails | Log warning, continue (do not abort optimization) |

---

## Files Affected

| File | Change |
|---|---|
| `agents/providers/hostinger-agent.md` | **Create** — Hostinger-specific provider agent |
| `wow-manifest.json` | **Modify** — add `provider_skills` + `browser_automation` sections |
| `agents/inventory-agent.md` | **Modify** — add `plan_tier` to output schema and detection logic |
| `skills/wow-execute/SKILL.md` | **Modify** — route provider dispatch on `hosting_provider` |
| `scripts/install.sh` | **Modify** — add hostinger plugin install commands |

---

## Non-Goals

- Does not cover non-Hostinger providers (handled by `provider-agent.md`)
- Does not implement Hostinger billing, domains, or email features (not WP optimization)
- Does not replace the generic `provider-agent.md` — it remains the fallback for all other hosts
