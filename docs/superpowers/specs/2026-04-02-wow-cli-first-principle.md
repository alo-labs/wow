# WOW — CLI-First Principle & Resolved MCPs

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alolabs/wow
**Date**: 2026-04-02
**Sub-project**: 5 of N — CLI-First Principle & Resolved MCPs

---

## Overview

This sub-project resolves the two PENDING MCP entries in `wow-manifest.json`,
establishes a global CLI-first principle, and updates the browser automation
ladder across all agents to lead with Playwright CLI instead of Claude-in-Chrome.

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
  - Dynamic UI with unknown/changing selectors
  - One-off interactive steps requiring visual judgment
  - Tasks where automation would be fragile or unreliable

Tier 3 — computer-use
  Fallback when Claude-in-Chrome is not available

Tier 4 — user prompt
  ONLY for: credential entry and sign-in
  NEVER for: clicking, navigating, configuring, or any automatable action
```

### When Playwright CLI is sufficient (use it)
- Full-page screenshots (before/after comparison)
- Navigation + page load verification
- Form filling with known field selectors
- Clicking known UI elements (buttons, checkboxes, toggles)
- Visual health checks (blank page detection, error screen detection)
- Any repeatable, pattern-based browser interaction

### When Claude-in-Chrome is needed (Playwright insufficient)
- Hosting panels with captcha or bot detection that blocks headless browsers
- Tasks where selectors are unknown and visual judgment is required
- One-off interactive flows that are not worth automating

### MCP usage
MCPs are only used when no CLI alternative exists for the required capability.
The `browser` and `wp-cli` MCP entries are removed — both have superior CLI alternatives.

---

## Playwright CLI

**Tool:** Playwright CLI via `npx playwright`
**Install:** `npx playwright install --with-deps chromium` (added to `scripts/install.sh`)
**Usage pattern in agents:**

```
Use Playwright CLI for browser tasks:
  npx playwright screenshot <url> --full-page --output <path>
  npx playwright navigate <url>
  npx playwright eval "<script>"
If the command exits non-zero or produces no output: fall through to Claude-in-Chrome.
```

**Note:** Playwright CLI availability is checked at runtime. If `npx playwright` is not
found (install failed or unavailable), fall through directly to Claude-in-Chrome.

---

## WP-CLI (native)

WP-CLI is already called directly via SSH in all agents. No change to agent behavior —
this sub-project formalizes the existing pattern in the manifest and global policy.

**Usage pattern:** `wp <command> --path=<wp_root> --allow-root`

If WP-CLI is unavailable (no SSH): agents already fall through to WP REST API
then browser automation. This order is unchanged.

---

## Updated 4-Tier Browser Automation Ladder

Replaces the current 3-tier ladder everywhere it appears:

```markdown
**Browser automation ladder (4 tiers — Playwright CLI first):**

**Tier 1 — Playwright CLI:**
- Run: `npx playwright screenshot <url> --full-page --output <path>`
  (or appropriate Playwright command for the task)
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

| File | Change |
|---|---|
| `wow-manifest.json` | Replace 2 PENDING entries with CLI documentation; add `cli_tools` + `cli_first` note |
| `scripts/install.sh` | Add Playwright CLI install step |
| `skills/wow/SKILL.md` | Update global policy (section 1b) — 4-tier ladder + CLI-first rule |
| `agents/screenshot-agent.md` | Tier 1 → Playwright CLI screenshot; Tier 2 → Claude-in-Chrome |
| `agents/plugin-agent.md` | Browser tier (Tier 3 of install/configure) → Playwright CLI first, then Claude-in-Chrome |
| `agents/provider-agent.md` | CDN + hosting panel browser tasks → Playwright CLI first, then Claude-in-Chrome |
| `agents/custom-agent.md` | Browser path → Playwright CLI first, then Claude-in-Chrome |
| `agents/providers/hostinger-agent.md` | hPanel ladder → Playwright CLI first, then Claude-in-Chrome |

**Not changed:** `agents/report-agent.md`, `skills/wow-report/SKILL.md` — opening a
local HTML file for viewing is a one-off interactive action, not a repetitive task;
Claude-in-Chrome remains Tier 1 there.

---

## Manifest Changes

### Remove

```json
"browser": "PENDING — free Playwright/Puppeteer MCP to be evaluated",
"wp-cli": "PENDING — free WP-CLI MCP to be evaluated"
```

### Add

```json
"cli_tools": {
  "_note": "CLI tools used directly — no MCP wrapper. CLIs are preferred over MCPs whenever available.",
  "browser_automation": "playwright-cli — npx playwright (install: npx playwright install --with-deps chromium)",
  "wp_management": "wp-cli — native WP-CLI via SSH (wp plugin install, wp option update, etc.)"
},
```

---

## Non-Goals

- Does not change the WP REST API tier (remains Tier 2 for WP tasks after WP-CLI)
- Does not change the `wow-report` HTML open flow (Claude-in-Chrome stays Tier 1 there)
- Does not remove any MCP that has no CLI alternative (lighthouse-mcp stays)
- Does not install WP-CLI — assumed to be available on the target server via SSH
