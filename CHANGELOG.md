# Changelog

All notable changes to WOW are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

Versioning: `MAJOR.MINOR.YYYYMMDDNN` (semver with date-based patch + daily build serial).

---

## [0.1.2026040201] — 2026-04-02

First release of WOW (WordPress → Optimized WordPress).

### Added

**Core Orchestration (Sub-project 1)**
- Iterative optimization loop: INTAKE → AUDIT → PLAN → EXECUTE → VERIFY → REPORT
- 7 phase skills: `wow`, `wow-intake`, `wow-audit`, `wow-plan`, `wow-execute`, `wow-verify`, `wow-report`
- Session state management via `/tmp/.wow/session.json`
- Autonomous and supervised execution modes
- Configurable improvement threshold (default 5%) and max iterations (default 10)
- Last-resort direct intervention when community resources are exhausted

**Specialist Agents (Sub-project 2)**
- `lighthouse-agent` — Lighthouse audit via MCP for structured performance scores
- `inventory-agent` — WordPress environment fingerprinting (plugins, theme, PHP, server, CDN, hosting provider)
- `screenshot-agent` — Before/after screenshots via 3-tier ladder + graceful skip
- `plan-agent` — Gap analysis, community resource mapping, conflict-free action ranking across 5 domains
- `plugin-agent` — Free WordPress plugin installation and configuration with WP-CLI/REST/browser fallback
- `provider-agent` — Server-level tuning (PHP-FPM, OPcache, gzip, CDN) with safety rules
- `custom-agent` — Direct file edits (.htaccess, wp-config.php, mu-plugins) with timestamped backups
- `report-agent` — Styled HTML report + markdown terminal summary with before/after comparison

**Hostinger Provider Support (Sub-project 3)**
- `hostinger-agent` — Dedicated hPanel automation for Hostinger-hosted sites
- VPS snapshot support for VPS-tier Hostinger plans
- Fallback to generic `provider-agent` when `wordpress-manager` unavailable

**Browser Automation (Sub-project 4)**
- 4-tier browser automation ladder: Playwright CLI → Claude-in-Chrome → computer-use → user prompt
- Global CLI-first principle: CLIs preferred over MCPs and browser tools
- Playwright CLI as Tier 1 across all browser-action agents

**CLI-First Principle (Sub-project 5)**
- WP-CLI as primary tool for all WordPress management tasks
- Task domain mapping: WP tasks (WP-CLI), server tasks (SSH), browser tasks (Playwright CLI)
- `wow-manifest.json` `cli_tools` section documenting CLI dependencies

**Theme Analysis & Visual Regression (Sub-project 6)**
- `theme-analysis-agent` — Render-blocking resources, stylesheet bloat, web font loading, DOM size, content image issues
- Node.js + Playwright script for structured DOM extraction with Claude-in-Chrome fallback
- `visual-regression-agent` — ImageMagick pixel diff (`compare -metric AE -fuzz 5%`) + Claude visual judgment
- Severity classification: none/low/medium/high based on diff percentage and regression type
- Theme/content action domains in plan-agent for mu-plugin-based fixes
- Theme & Content Analysis comparison table in report (baseline vs final)
- Visual Regression Log in report with base64-embedded diff images

**Backup & Rollback (Sub-project 7)**
- `backup-agent` — Full WordPress backup via BackWPup plugin + SSH database/files archive
- Hosting-level backup via SSH or hosting panel automation (Hostinger hPanel supported)
- Backup files stored in `/tmp/.wow/backups/` with restricted permissions (chmod 600/700)
- Per-iteration state snapshots: file contents (custom-agent), plugin list (plugin-agent), server settings (provider-agent)
- Selective rollback by iteration range via `/wow rollback` command
- Automatic rollback prompt when visual regression detected (always requires user confirmation)
- Non-blocking: backup and regression failures never stop the optimization loop

**Infrastructure**
- `scripts/install.sh` — Automated dependency installer (community skills, Playwright, ImageMagick, lighthouse-mcp)
- `scripts/validate-plugin.sh` — Plugin structure validation (68 checks)
- 3 enforcement hooks: phase-enforcer, loop-controller, progress-reporter
- `wow-manifest.json` — Resource manifest with skills, MCP servers, CLI tools, browser automation tiers, WP plugin allowlist

### Security

- Credentials stored only in session context, never written to disk
- Backup files use restricted permissions (chmod 600) in protected directory (chmod 700)
- Tar archives bounded at 2 GB with 5-minute timeout to prevent disk exhaustion
- All agents verify site returns HTTP 200 after modifications; restore on failure
- Provider-agent validates config syntax before service restarts
- Human intervention limited to credentials/sign-in only (Tier 4 policy)
