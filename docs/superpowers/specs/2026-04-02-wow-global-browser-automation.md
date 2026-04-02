# WOW — Global Browser Automation Policy

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alo-labs/wow
**Date**: 2026-04-02
**Sub-project**: 3 of N — Global Browser Automation

---

## Overview

Claude-in-Chrome is promoted from a Hostinger-specific fallback to a first-class
tool available across the entire WOW agent system. Every agent may invoke it to
complete tasks that skills, CLIs, or APIs cannot — or to perform visual checks.
Human intervention is reserved exclusively for credential entry and sign-in.

---

## Global Browser Automation Policy

### When to use browser automation

Use Claude-in-Chrome (or computer-use as fallback) whenever:

1. A required task cannot be completed via CLI, REST API, or a community skill
2. A visual check is needed (page rendering, before/after comparison, error detection)
3. A plugin or hosting panel offers a UI-only configuration option
4. Verifying that a change had its intended visual effect

### 3-tier automation ladder (global)

```
Tier 1 — Claude-in-Chrome (primary)
  Check: mcp__Claude_in_Chrome__navigate callable?
  If yes: use it for navigation, clicking, form-filling, visual inspection
  If tool call raises error or returns failure: fall through to Tier 2

Tier 2 — computer-use (fallback)
  Check: mcp__computer-use__screenshot callable?
  If yes: take screenshot, locate UI elements, interact
  If tool call raises error or returns failure: fall through to Tier 3

Tier 3 — user prompt (last resort, credentials/sign-in ONLY)
  Emit a structured request. Human is ONLY asked for:
    - Credential entry (passwords, API keys, tokens)
    - Authentication / sign-in steps
  Human is NEVER asked to: click buttons, navigate menus, configure settings,
  or perform any task that browser automation could accomplish.
```

### Human intervention policy

The only acceptable reason to ask a human during a WOW run:

1. **Credentials** — passwords, API keys, tokens that cannot be stored
2. **Sign-in** — when Claude-in-Chrome requires authentication to proceed

Everything else — navigating hosting panels, configuring plugin settings,
enabling features via WP Admin, visual verification — must be handled by
the browser automation ladder before escalating to the user.

---

## Changes Per Agent

### `agents/screenshot-agent.md`

**Before**: Vague "browser MCP" reference; falls back to skipped if unavailable.

**After**: Explicitly uses Claude-in-Chrome as primary. After capturing the
screenshot, performs a basic visual health check: confirms page is rendering
(no blank page, no fatal error screen). Uses computer-use as fallback. Removes
the "PENDING" fallback entirely — screenshot is now always attempted.

### `agents/plugin-agent.md`

**Before**: WP-CLI → REST API → report failed.

**After**: WP-CLI → REST API → Claude-in-Chrome (WP Admin) → report failed.

Browser automation step:
- Navigate to WP Admin > Plugins > Add New
- Search for slug, click Install, click Activate
- Navigate to plugin settings page to apply configuration
- Used when both WP-CLI and REST API are unavailable or fail

### `agents/provider-agent.md` (generic)

**Before**: SSH optimizations + advisory messages for CDN/Cloudflare.

**After**: SSH optimizations + browser automation for hosting panel UI tasks.
The Cloudflare advisory becomes an action: navigate to Cloudflare dashboard
via browser, configure Auto Minify and Rocket Loader directly.

Generic hosting panel tasks now handled via browser:
- Any cPanel/Plesk/DirectAdmin UI-only setting
- Cloudflare dashboard configuration
- Any other hosting panel UI when SSH is unavailable

### `agents/custom-agent.md`

**Before**: SSH + file system only; last resort before orchestrator.

**After**: SSH + file system + browser automation for UI-required fixes.
When SSH is unavailable but a fix can be achieved via WP Admin (e.g.,
configuring a plugin setting, enabling a feature toggle), use browser
automation instead of failing.

### `skills/wow/SKILL.md`

**Before**: No explicit browser automation policy. Browser only mentioned
implicitly in agent files.

**After**: Global browser automation policy documented as a top-level
section after community skills are loaded (Step 1). Establishes the
principle: browser automation is available at every phase; human prompts
are for credentials and sign-in only.

### `wow-manifest.json`

**Before**: `browser_automation._note` described it as Hostinger-scoped.

**After**: Note updated to reflect global scope across all agents.

---

## Non-Goals

- Does not change the 3-tier ladder in `hostinger-agent.md` (already correct)
- Does not add browser automation to read-only agents (lighthouse-agent,
  inventory-agent, plan-agent) — these don't take write actions
- Does not change the loop control or hook logic
- Does not introduce new state files — browser actions are logged in each
  agent's existing actions.json output
