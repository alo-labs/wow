# WOW — CLI-First Principle & Resolved MCPs

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alo-labs/wow
**Date**: 2026-04-02
**Sub-project**: 5 of N — CLI-First Principle & Resolved MCPs

---

## Overview

This sub-project resolves the two PENDING MCP entries in `wow-manifest.json`,
establishes a global CLI-first principle, and updates the browser automation
ladder across all agents that take browser actions to lead with Playwright CLI
instead of Claude-in-Chrome.

**Core rule:** Whenever a CLI alternative exists, use it instead of an MCP or
interactive browser tool. CLIs are faster, cheaper (fewer tokens), more reliable,
and more composable.

---

## CLI-First Principle

### Decision hierarchy (global, applies to all agents)

```
Tier 1 — CLI (always try first)
  Browser tasks : Playwright CLI  →  npx playwright <command>
  WP tasks      : WP-CLI          →  wp plugin install / wp option update / etc.
  Server tasks  : SSH             →  php-fpm restart, opcache config, htaccess

Tier 2 — Claude-in-Chrome
  Use ONLY when Playwright CLI is insufficient:
  - Hosting panels with captcha or bot detection blocking headless browsers
  - Tasks where selectors are unknown and visual judgment is required
  - One-off interactive flows that are not worth automating with a script

Tier 3 — computer-use
  Fallback when Claude-in-Chrome is not available

Tier 4 — user prompt
  ONLY for: credential entry and sign-in
  NEVER for: clicking, navigating, configuring, or any automatable action
```

### Task domain mapping

**WP tasks (WP-CLI → REST API → browser):**
Plugin install/activate, option updates, DB operations, user management.
WP-CLI is for WordPress application management, not server configuration.

**Server tasks (SSH only):**
PHP-FPM, OPcache, htaccess, nginx config, server-level caching.
These are server concerns — WP-CLI does not apply here.

**Browser tasks (Playwright CLI → Claude-in-Chrome → computer-use):**
Screenshots, page load checks, UI form fills, hosting panel configuration,
WP Admin tasks when WP-CLI and REST API are unavailable.

### Agents that do NOT need browser ladder updates

Read-only agents take no browser actions and are unaffected:
- `agents/inventory-agent.md` — reads headers/API, no UI interaction
- `agents/plan-agent.md` — synthesizes data, no UI interaction
- `agents/lighthouse-agent.md` — uses lighthouse-mcp, no direct browser calls

### MCP usage

MCPs are only used when no CLI alternative exists.
The `browser` and `wp-cli` PENDING MCP entries are removed — both have
superior CLI alternatives.
`lighthouse-mcp` is retained — no CLI alternative provides equivalent
structured Lighthouse score output.

---

## Playwright CLI

**Tool:** `npx playwright` (installed globally via `scripts/install.sh`)

**Install (one-time, in install.sh):**
```bash
npx playwright install --with-deps chromium
```
This is idempotent — safe to run multiple times. Agents do NOT run this;
install.sh runs it once during plugin setup.

**Correct command patterns:**

```bash
# Full-page screenshot
npx playwright screenshot --browser=chromium --full-page \
  https://example.com /tmp/.wow/screenshots/page.png

# Navigate and check page loads (exit 0 = success)
npx playwright screenshot --browser=chromium \
  https://example.com /tmp/check.png

# Evaluate JS on a page (returns result to stdout)
npx playwright evaluate --browser=chromium \
  https://example.com "document.title"
```

Note: `npx playwright screenshot <url> <output>` is the correct single-command
pattern for screenshots. There is no separate `navigate` subcommand — navigation
is implicit when a URL is passed to `screenshot` or `evaluate`.

**Runtime availability check:**
```bash
npx playwright --version >/dev/null 2>&1 || echo "playwright_not_found"
```
If not found: fall through directly to Claude-in-Chrome (Tier 2).

**Usage pattern in agents:**
```
Use Playwright CLI for browser tasks:
  npx playwright screenshot --browser=chromium --full-page <url> <output_path>
  npx playwright evaluate --browser=chromium <url> "<js_expression>"
If command exits non-zero or outputs "playwright_not_found": fall through to Tier 2.
```

---

## WP-CLI (native)

WP-CLI is already called directly via SSH in all agents. No behavior change —
this sub-project formalizes the existing pattern in the manifest and global policy.

**Usage pattern:** `wp <command> --path=<wp_root> --allow-root`

**Tier ordering for WP tasks (unchanged):**
1. WP-CLI via SSH
2. WP REST API
3. Browser automation (4-tier ladder)

If WP-CLI is unavailable (no SSH access): fall through to WP REST API,
then browser automation. This existing order is unchanged.

---

## Updated 4-Tier Browser Automation Ladder

Replaces the current 3-tier ladder in all browser-action agents:

```markdown
**Browser automation ladder (4 tiers — Playwright CLI first):**

**Tier 1 — Playwright CLI:**
- Check availability: `npx playwright --version >/dev/null 2>&1`
- If available: run `npx playwright screenshot --browser=chromium --full-page <url> <path>`
  (or `npx playwright evaluate` for JS-based checks)
- If command exits non-zero or Playwright not found: fall through to Tier 2

**Tier 2 — Claude-in-Chrome:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: use for tasks requiring interactive or visual judgment
- If tool call raises error or returns failure: fall through to Tier 3

**Tier 3 — computer-use:**
- Check: is `mcp__computer-use__screenshot` callable?
- If yes: screenshot-guided interaction
- If tool call raises error or returns failure: fall through to Tier 4

**Tier 4 — user prompt (credentials and sign-in ONLY):**
- Ask the human ONLY for: passwords, API keys, tokens, or authentication steps
- NEVER ask the human to click, navigate, or configure
```

---

## Files Changed

### Browser-action agents (ladder updated to 4-tier)

| File | Change |
|---|---|
| `skills/wow/SKILL.md` | Update global policy (section 1b) — 4-tier ladder + CLI-first rule + task domain mapping |
| `agents/screenshot-agent.md` | Tier 1 → Playwright CLI screenshot + health check; Tier 2 → Claude-in-Chrome |
| `agents/plugin-agent.md` | Browser tier (install/configure fallback) → Playwright CLI first, then Claude-in-Chrome |
| `agents/provider-agent.md` | CDN + hosting panel browser tasks → Playwright CLI first, then Claude-in-Chrome |
| `agents/custom-agent.md` | Browser path → Playwright CLI first, then Claude-in-Chrome |
| `agents/providers/hostinger-agent.md` | hPanel ladder → Playwright CLI first, then Claude-in-Chrome |

### Infrastructure

| File | Change |
|---|---|
| `wow-manifest.json` | Remove 2 PENDING MCP entries; add `cli_tools` section; keep `browser_automation` object |
| `scripts/install.sh` | Add Playwright CLI install step |

### Not changed

| File | Reason |
|---|---|
| `agents/report-agent.md` | Report HTML viewing is an interactive one-off — user looks at the rendered report in a real browser, not a headless screenshot. Claude-in-Chrome stays Tier 1. |
| `skills/wow-report/SKILL.md` | Same reason as above |
| `agents/inventory-agent.md` | Read-only, no browser actions |
| `agents/plan-agent.md` | Read-only, no browser actions |
| `agents/lighthouse-agent.md` | Uses lighthouse-mcp (no CLI alternative), no direct browser calls |

---

## Manifest Changes (exact diff)

### In `mcp_servers` — remove 2 entries

**Remove:**
```json
"browser": "PENDING — free Playwright/Puppeteer MCP to be evaluated",
"wp-cli": "PENDING — free WP-CLI MCP to be evaluated"
```

**Result:** `mcp_servers` retains only `lighthouse`.

### Add new top-level key `cli_tools` (after `mcp_servers`)

```json
"cli_tools": {
  "_note": "CLI tools used directly — no MCP wrapper. CLIs are preferred over MCPs whenever a CLI alternative exists.",
  "browser_automation": "playwright-cli — npx playwright screenshot/evaluate (install via scripts/install.sh)",
  "wp_management": "wp-cli — native WP-CLI via SSH (wp plugin install, wp option update, wp db optimize, etc.)"
},
```

### `browser_automation` object — keep, update note only

The existing `browser_automation` object (`primary`, `fallback`, `last_resort` keys)
documents agent behavior tiers. Update its `_note` to reference the 4-tier ladder:

```json
"browser_automation": {
  "_note": "4-tier browser automation ladder for all browser-action agents. See skills/wow/SKILL.md §1b.",
  "tier1": "playwright-cli",
  "tier2": "Claude-in-Chrome",
  "tier3": "computer-use",
  "tier4": "user_prompt (credentials and sign-in only)"
},
```

---

## Non-Goals

- Does not change WP REST API tier (remains Tier 2 for WP tasks after WP-CLI)
- Does not remove `lighthouse-mcp` (no CLI alternative for structured Lighthouse scores)
- Does not install WP-CLI — assumed available on the target server via SSH
- Does not apply the 4-tier ladder to read-only agents (inventory, plan, lighthouse)
