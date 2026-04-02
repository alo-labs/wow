# WOW — WordPress → Optimized WordPress

**Autonomous Claude Code plugin that optimizes any WordPress site to world-class performance.**

WOW orchestrates community skills, MCP tools, and specialist subagents through an iterative loop — auditing, planning, executing, and verifying until diminishing returns. It handles everything from plugin installation to server-level PHP-FPM tuning, with full backup and rollback safety.

**Author:** Shafqat Ullah | **Org:** [Alo Labs](https://alolabs.dev) | **License:** MIT

---

## Quick Start

```bash
# Install the plugin
/plugin install alo-labs/wow

# Run it
/wow
```

WOW will ask for your site URL, WordPress admin credentials, and SSH/hosting access (optional). Then it runs autonomously.

## What It Does

WOW runs an iterative optimization loop:

```
INTAKE → AUDIT → PLAN → EXECUTE → VERIFY → repeat
```

Each iteration:
1. **Audits** the site (Lighthouse scores, Core Web Vitals, plugin inventory, theme analysis)
2. **Plans** ranked actions across 5 domains (plugin, provider, custom, theme, content)
3. **Backs up** the site (BackWPup + SSH/hosting snapshot)
4. **Executes** changes via specialist agents in parallel
5. **Checks for visual regressions** (ImageMagick pixel diff + Claude visual judgment)
6. **Verifies** improvement via re-audit and delta calculation
7. **Stops** when improvement drops below threshold (default 5%)

At the end, it generates a styled HTML report with before/after scores, action log, theme analysis comparison, and visual regression log.

## Optimization Domains

| Domain | What it covers | Agent |
|--------|---------------|-------|
| **Plugin** | Install and configure free WP optimization plugins (caching, image optimization, asset minification) | `plugin-agent` |
| **Provider** | Server-level tuning — PHP-FPM, OPcache, gzip/brotli, CDN configuration | `provider-agent` |
| **Custom** | Direct file edits — `.htaccess`, `wp-config.php`, must-use plugins | `custom-agent` |
| **Theme** | Theme CSS/JS behavior — `font-display: swap`, render-blocking script deferral, stylesheet optimization | `custom-agent` (via mu-plugin) |
| **Content** | In-content markup fixes — lazy loading, image dimensions, srcset generation | `custom-agent` (via mu-plugin) |

## Safety

WOW is designed to be safe on production sites:

- **Full backup before every iteration** — BackWPup plugin backup + SSH database/files archive + hosting panel snapshot
- **Visual regression detection** — ImageMagick pixel diff after every change; Claude inspects flagged regressions
- **Selective rollback** — undo any iteration range; user confirmation always required
- **Non-blocking failures** — backup, regression, and theme analysis failures are logged, never stop the loop
- **Credentials never written to disk** — stored only in session context
- **Safety rules** — agents verify site returns HTTP 200 after every modification, restore from backup on failure

### Rollback

```bash
# Roll back to after iteration 2 (undoes iterations 3, 4, ...)
/wow rollback
```

Automatic rollback prompt appears when visual regression is detected. Always requires confirmation, even in autonomous mode.

## Hosting Providers

WOW works with any WordPress host. SSH access enables server-level optimizations.

| Provider | Level of support |
|----------|-----------------|
| **Hostinger** | Dedicated agent — hPanel automation, VPS snapshots, LiteSpeed config |
| **All others** | Generic provider agent — SSH-based server tuning, CDN configuration |

## Browser Automation

WOW uses a 4-tier browser automation ladder when CLI/API alternatives are unavailable:

1. **Playwright CLI** (preferred) — headless, fast, scriptable
2. **Claude-in-Chrome** — interactive browser control
3. **computer-use** — screenshot-guided interaction
4. **User prompt** — credentials and sign-in only; never asked to click or configure

The **CLI-first principle** applies globally: whenever a CLI alternative exists, WOW uses it instead of browser automation.

## Architecture

```
skills/
  wow/SKILL.md              ← Main orchestrator
  wow-intake/               ← Credential collection
  wow-audit/                ← Lighthouse + inventory + screenshot
  wow-plan/                 ← Gap analysis + action ranking
  wow-execute/              ← Parallel agent dispatch
  wow-verify/               ← Delta calculation + stop condition
  wow-report/               ← HTML + markdown report generation

agents/
  backup-agent.md           ← BackWPup + SSH/hosting backup
  lighthouse-agent.md       ← Lighthouse audit via MCP
  inventory-agent.md        ← Plugin/theme/server fingerprinting
  screenshot-agent.md       ← Before/after screenshots
  plan-agent.md             ← Action planning + regression awareness
  plugin-agent.md           ← WP plugin install/config + snapshot/undo
  provider-agent.md         ← Server tuning + snapshot/undo
  custom-agent.md           ← File edits + snapshot/undo
  theme-analysis-agent.md   ← Render-blocking/font/DOM/image analysis
  visual-regression-agent.md ← Pixel diff + Claude visual judgment
  report-agent.md           ← Report generation
  providers/
    hostinger-agent.md      ← Hostinger-specific hPanel automation

hooks/
  phase-enforcer.sh         ← Ensures phases run in order
  loop-controller.sh        ← Evaluates stop conditions
  progress-reporter.sh      ← Shows optimization progress

scripts/
  install.sh                ← Dependency installer
  validate-plugin.sh        ← Plugin structure validation
```

## Requirements

- **Claude Code** (CLI, desktop app, or web)
- **Node.js** 18+ (for Playwright CLI)
- **jq** (JSON processing)
- **WordPress site** with admin access
- **SSH access** (optional but recommended for server-level optimizations)

## Dependencies

Installed automatically by `scripts/install.sh`:

| Dependency | Purpose |
|-----------|---------|
| `wordpress/agent-skills@wp-performance` | WordPress profiling, caching, DB optimization |
| `jeffallan/claude-skills@wordpress-pro` | Transient/object caching, query optimization |
| `addyosmani/web-quality-skills@core-web-vitals` | LCP, CLS, INP scoring |
| `addyosmani/web-quality-skills@performance` | Loading speed, resource optimization |
| `addyosmani/web-quality-skills@best-practices` | HTTPS, security headers, modern APIs |
| `priyankark/lighthouse-mcp` | Structured Lighthouse audit scores |
| Playwright + Chromium | Browser automation (screenshots, UI interaction) |
| ImageMagick | Visual regression pixel diff |

## Modes

- **Autonomous** — fully hands-off; WOW optimizes and reports back
- **Supervised** — pauses before each execution phase for approval

## Versioning

Semver: `MAJOR.MINOR.PATCH` where PATCH is `YYYYMMDDNN` (date + 2-digit daily build serial).

Example: `0.1.2026040201` = first build on April 2, 2026.

## License

MIT
