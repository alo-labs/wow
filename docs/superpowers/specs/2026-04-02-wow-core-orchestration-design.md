# WOW — Core Agent & Orchestration Design

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alo-labs/wow
**Date**: 2026-04-02
**Sub-project**: 1 of N — Core Agent & Orchestration

---

## Overview

WOW is a Claude Code plugin that autonomously optimizes any WordPress site to world-class
performance. It is a pure orchestration layer — it bundles no optimization logic itself.
All domain knowledge comes from free community skills it installs as dependencies; all
tooling comes from free/open-source MCP servers it configures. When community resources
are exhausted, the orchestrator applies its own domain knowledge directly as a last resort.

The agent stops only when further iterations yield diminishing returns, not when a
checklist runs out.

**Entry point**: `/wow`
**Install**: `/plugin install alo-labs/wow`

---

## Architecture

### Plugin Structure

```
wow/
├── skills/
│   ├── wow/              ← main slash command + orchestrator
│   ├── wow-intake/       ← conversational intake phase
│   ├── wow-audit/        ← audit phase coordinator
│   ├── wow-plan/         ← planning + gap analysis phase
│   ├── wow-execute/      ← execution phase coordinator
│   └── wow-verify/       ← verification + loop control
├── hooks/
│   ├── phase-enforcer    ← HARD STOP if phases skipped
│   ├── approval-gate     ← human checkpoints (supervised mode)
│   ├── loop-controller   ← improvement delta, stop/continue
│   └── progress-reporter ← status line after every phase
├── agents/
│   ├── lighthouse-agent.md   ← Lighthouse + CWV scores
│   ├── inventory-agent.md    ← installed plugins, PHP, server stack
│   ├── screenshot-agent.md   ← before/after screenshots (sub-project 1 scope only)
│   ├── plan-agent.md         ← gap analysis + action list
│   ├── plugin-agent.md       ← WP plugin install/configure on target
│   ├── provider-agent.md     ← hosting-level optimizations
│   └── custom-agent.md       ← bespoke fixes when plugins insufficient
└── wow-manifest.json         ← curated skills, MCPs, WP plugins registry
```

---

## The Optimization Pipeline

The outer loop runs until the improvement delta (as a percentage) falls below threshold
for two consecutive iterations (default threshold: 5%).

Delta is computed as: `delta_pct = ((current_score - previous_score) / previous_score) * 100`

The loop-controller compares `delta_pct` against the threshold. For example, a threshold
of 5 means `delta_pct < 5` triggers stop evaluation.

```
/wow
  │
  ▼
INTAKE → AUDIT → PLAN → [approval?] → EXECUTE → VERIFY → loop or DONE
                                                    │
                                          delta_pct > threshold?
                                            yes → PLAN (next iteration)
                                            no for 2 consecutive runs → REPORT
```

A `max_iterations` cap (default: 10, configurable at intake) prevents infinite loops on
pathological sites. If reached before diminishing returns, REPORT is generated with a
note that the cap was hit.

### INTAKE
Conversational. Agent asks:
- Target site URL
- WordPress admin credentials (or application password / API key)
- SSH/hosting panel access (optional, enables server-level optimizations)
- Autonomy mode: **hands-off** (fully autonomous) or **supervised** (approval before EXECUTE)
- Improvement threshold (default: 5%)
- Maximum iterations (default: 10)
- Focus areas (optional: "prioritize LCP" / "fix CLS" / "everything")

**Credential security**: Credentials are never written to disk. After intake, the
orchestrator stores credentials exclusively in Claude's in-session context (not in
`session.json` or any state file). `session.json` stores only a non-sensitive reference
label (e.g., `"credentials": "provided_in_session"`) so the orchestrator knows credentials
were collected. On interruption and resume, the orchestrator re-asks for credentials if
the session context no longer holds them.

Hosting provider is auto-detected from server fingerprint during AUDIT.

### AUDIT (parallel subagents)
Three agents run concurrently:
- `lighthouse-agent` — Lighthouse scores + Core Web Vitals (establishes baseline on first run)
- `inventory-agent` — installed WP plugins, active theme, PHP version, server stack, hosting provider
- `screenshot-agent` — full-page screenshot for the report (no diff analysis in sub-project 1)

> **Note**: `screenshot-agent` captures before/after screenshots for inclusion in the
> final REPORT only. Full visual regression diff analysis (pixel-level comparison,
> perceptual diff scoring) is deferred to sub-project 4.

### PLAN (single agent, sequential)
Synthesizes all audit output into a ranked action list. Gap analysis follows this priority:

```
1. Match gap to known skill/MCP in manifest     → use it
2. Search for individual Claude Code skills      → npx skills add
3. Search for Claude Code plugin bundles         → /plugin install
4. Search for free MCP servers                   → npm install -g
5. Search for free WP plugins for target site    → wp plugin install (free tier only)
6. Orchestrator direct intervention              → custom code/config/patches
```

Discovery evaluation criteria: stars/downloads, last updated, free license,
no security flags, core optimization features not gated behind payment.

Output: structured ranked action list consumed by execution agents.

### EXECUTE (parallel subagents by domain, with coordination)

Execution agents run in parallel within their assigned domains. Before parallel dispatch,
the plan agent assigns each action to exactly one agent domain to prevent conflicts:

- `plugin-agent` — installs and configures free WP optimization plugins on target site
- `provider-agent` — hosting-level: LiteSpeed cache, CDN, PHP-FPM, server cache headers
- `custom-agent` — bespoke fixes: htaccess rules, wp-config tweaks, asset patches

**Conflict prevention**: The plan agent is responsible for conflict-free assignment.
Actions that touch shared configuration surfaces (e.g., both a caching plugin and a
custom htaccess rule affecting the same cache headers) are assigned to a single agent
or sequenced explicitly in the action list. Parallel agents do not communicate at
runtime — conflicts are resolved at plan time, not execution time.

### VERIFY (sequential)
- Re-runs full AUDIT
- Computes `delta_pct = ((current_score - previous_score) / previous_score) * 100`
- Captures after screenshot for REPORT
- If `delta_pct > threshold` → clears execution state, loops to PLAN with new baseline
- If `delta_pct ≤ threshold` for two consecutive runs → proceeds to REPORT
- If `iteration_count >= max_iterations` → proceeds to REPORT with cap notice

### REPORT
Before/after Lighthouse scores, CWV metrics, before/after screenshots, all changes
applied, iteration count, any remaining gaps with explanation of why they could not
be closed.

---

## Agent Team

### Orchestrator (`wow` skill)
Runs the outer loop, manages state, triggers approval gates, and acts as
**last-resort problem solver** when all community resources are exhausted.
Carries full WordPress + performance domain knowledge via bundled skills.

### Audit Agents (parallel, each iteration)
| Agent | Responsibility | Tools |
|---|---|---|
| `lighthouse-agent` | Lighthouse + CWV scores, delta tracking | lighthouse-mcp |
| `inventory-agent` | Plugins, theme, PHP version, hosting fingerprint | WP REST API / WP-CLI MCP |
| `screenshot-agent` | Before/after screenshots for REPORT (no diff analysis) | Browser/Playwright MCP |

### Plan Agent (sequential)
- Synthesizes audit output
- Assigns each action to a single execution agent domain (conflict prevention)
- Queries wp.org API + GitHub + npm for gap coverage
- Produces ranked action list with expected impact per item

### Execution Agents (parallel per domain)
| Agent | Responsibility |
|---|---|
| `plugin-agent` | Install + configure free WP optimization plugins on target site |
| `provider-agent` | Hosting-level: LiteSpeed, CDN, PHP-FPM, server cache |
| `custom-agent` | Bespoke: htaccess, wp-config, custom code patches |

---

## Hooks

| Hook | Trigger | Behavior |
|---|---|---|
| `phase-enforcer` | PreToolUse | HARD STOP if any write/execution tool fires without `plan.json` present in current iteration state dir |
| `approval-gate` | Orchestrator flow (between PLAN and EXECUTE) | In supervised mode: orchestrator presents action list and awaits explicit user confirmation before dispatching execution agents |
| `loop-controller` | PostToolUse (after VERIFY) | Computes `delta_pct`, writes to `delta.json`, checks consecutive-run and max-iteration conditions, sets loop or stop flag |
| `progress-reporter` | PostToolUse (after each phase) | Emits status: scores, `delta_pct`, iteration count, next action |

**phase-enforcer definitions**:
- *Execution tool*: any tool that writes to the target site — WP-CLI commands, REST API
  write calls, SSH/SFTP file writes, wp plugin install/activate
- *Valid plan*: presence of `iterations/N/plan.json` where N is the current iteration
  number stored in `session.json`

**approval-gate clarification**: This is implemented as logic within the orchestrator
skill itself (not as a PostToolUse hook) — the orchestrator reads autonomy mode from
`session.json` and pauses between PLAN and EXECUTE dispatch when in supervised mode.

---

## Community Resources Manifest

> **Note**: `browser` and `wp-cli` MCP server entries are pending evaluation.
> Candidates will be selected based on free license, active maintenance, and
> compatibility with Claude Code before implementation begins. The manifest
> below marks these as unresolved placeholders.

```json
{
  "skills": {
    "wordpress-performance": "wordpress/agent-skills@wp-performance",
    "wordpress-pro": "jeffallan/claude-skills@wordpress-pro",
    "core-web-vitals": "addyosmani/web-quality-skills@core-web-vitals",
    "web-performance": "addyosmani/web-quality-skills@performance",
    "best-practices": "addyosmani/web-quality-skills@best-practices"
  },
  "mcp_servers": {
    "lighthouse": "priyankark/lighthouse-mcp",
    "browser": "PENDING — free Playwright/Puppeteer MCP to be evaluated",
    "wp-cli": "PENDING — free WP-CLI MCP to be evaluated"
  },
  "wp_plugins_on_target_site": {
    "free_only": true,
    "caching": ["litespeed-cache", "w3-total-cache", "wp-super-cache"],
    "images": ["ewww-image-optimizer"],
    "database": ["wp-optimize"],
    "assets": ["autoptimize", "flying-scripts"],
    "security": ["really-simple-ssl"]
  }
}
```

> **Free-only enforcement**: All resources must offer core optimization features
> without payment. Tools with credit-based or API-quota free tiers that gate bulk
> operations behind payment (e.g., ShortPixel, Smush Pro) are excluded. `ewww-image-optimizer`
> replaces ShortPixel as it is fully free for local optimization.

All resources must be free or freemium with core optimization features available
without payment. Paid-only tools are never installed or recommended.

**Manifest updates**: The manifest is static in sub-project 1. To get an updated
manifest with new community resources, re-run `/plugin install alo-labs/wow`. A
community-maintained auto-update registry is planned for sub-project 5.

---

## State Management

State persists across loop iterations and survives interruptions. Credentials are
**never stored here** — see INTAKE section for credential security model.

```
/tmp/.wow/
├── session.json          ← URL, credentials ref label, autonomy mode, threshold,
│                           max_iterations, current_iteration, consecutive_below_threshold
├── baseline.json         ← first-run scores + screenshot paths
├── iterations/
│   ├── 1/
│   │   ├── audit.json    ← scores for this run
│   │   ├── plan.json     ← ranked action list (presence = valid plan flag)
│   │   ├── actions.json  ← what was executed
│   │   └── delta.json    ← delta_pct vs previous, threshold comparison result
│   └── 2/ ...
└── report.json           ← final before/after summary
```

---

## Installation

```bash
/plugin install alo-labs/wow
```

The install hook:
1. Runs `npx skills add` for each skill in the manifest
2. Configures each resolved MCP server in `claude_desktop_config.json`
3. Verifies all dependencies are active before confirming install

---

## Out of Scope (Future Sub-projects)

- Provider-specific modules (Hostinger, WP Engine, Kinsta) — sub-project 2
- Audit engine MCP server (custom Lighthouse wrapper) — sub-project 3
- Visual regression engine (pixel-level diff analysis) — sub-project 4
- Community manifest registry + auto-update — sub-project 5
- Multi-site batch optimization — sub-project 6
