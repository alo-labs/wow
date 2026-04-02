# WOW — Backup & Rollback Design

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alolabs/wow
**Date**: 2026-04-02
**Sub-project**: 7 of N — Backup & Rollback

---

## Overview

This sub-project adds full backup and selective rollback capabilities to the WOW optimization loop.

Before every EXECUTE phase, WOW:
1. Takes a full WordPress/WooCommerce backup via BackWPup
2. Takes a hosting-level backup via SSH or hosting panel
3. Snapshots all files, plugin states, and server settings that EXECUTE will touch

If a visual regression is detected after EXECUTE, WOW automatically prompts the user to roll back the current iteration. Users can also run `/wow rollback` at any time to roll back to any previous iteration.

All backup and rollback operations are **non-blocking** — failures are logged and reported but never stop the optimization loop.

---

## Architecture

### Approach: Self-snapshotting execution agents

The three execution agents (`custom-agent`, `plugin-agent`, `provider-agent`) each gain two new capabilities:

1. **Snapshot step** — at the start of their normal EXECUTE invocation, before making any changes, each agent reads and stores current state to `/tmp/.wow/iterations/N/snapshot.json`
2. **Undo mode** — when invoked with `mode: "rollback"` and a list of iteration snapshots, each agent reverses its changes using the stored state

A new **`backup-agent`** handles the full WordPress and hosting-level backups (separate from the per-agent snapshots which only cover what WOW directly touches).

### New files

```
agents/backup-agent.md     ← full WP backup via BackWPup + SSH/hosting backup
```

### Modified files

```
agents/custom-agent.md     ← add snapshot step + undo mode
agents/plugin-agent.md     ← add snapshot step + undo mode
agents/provider-agent.md   ← add snapshot step + undo mode
skills/wow/SKILL.md        ← wire backup-agent before EXECUTE; regression rollback prompt; /wow rollback command
```

### State files

| File | Written by | When |
|---|---|---|
| `/tmp/.wow/iterations/N/backup.json` | backup-agent | Before EXECUTE (every iteration) |
| `/tmp/.wow/iterations/N/snapshot.json` | custom-agent, plugin-agent, provider-agent | At start of EXECUTE (merged) |
| `/tmp/.wow/rollback-N.json` | orchestrator | After rollback completes |

---

## Backup Agent

### Role

Take a full recoverable backup of the WordPress site before any optimization changes are applied. Runs before every EXECUTE — before snapshot collection.

### Steps

#### Step 1 — Plugin backup (BackWPup)

1. Check if BackWPup is installed:
   ```bash
   wp plugin is-installed backwpup
   ```
   If not installed:
   ```bash
   wp plugin install backwpup --activate
   ```

2. Trigger a full backup job:
   ```bash
   wp backwpup startjob <first_job_id>
   ```
   If no job exists, create one first:
   ```bash
   wp backwpup job add --name="WOW-backup" --type="DB,FILE" --destination="FOLDER" --folder="wp-content/uploads/backwpup-backups/"
   ```

3. Wait for job completion (poll `wp backwpup jobs` until status is `done` or timeout after 5 minutes).

4. Record backup path in `backup.json`.

If WP-CLI unavailable: use the WP Admin backup UI via the 4-tier browser automation ladder (Playwright CLI → Claude-in-Chrome → computer-use → user prompt for credentials only).

If BackWPup installation fails: log `status: "failed"` and continue — SSH backup in Step 2 is sufficient.

#### Step 2 — SSH-first hosting backup

**If SSH available:**

1. Export database:
   ```bash
   wp db export /tmp/.wow-db-backup-N.sql
   ```

2. Archive WordPress files (exclude `uploads/` if >500MB to keep archiving fast):
   ```bash
   # Check uploads size first
   du -sh <wp_root>/wp-content/uploads/
   # If <= 500MB: include uploads
   tar -czf /tmp/.wow-files-backup-N.tar.gz <wp_root>
   # If > 500MB: exclude uploads
   tar -czf /tmp/.wow-files-backup-N.tar.gz --exclude=<wp_root>/wp-content/uploads <wp_root>
   ```

3. Record both paths in `backup.json`.

**If SSH unavailable — hosting panel fallback:**

Use the 4-tier browser automation ladder to trigger a hosting panel snapshot or checkpoint:
- Hostinger: use `hostinger-agent` logic to trigger a manual backup from hPanel
- Other providers: navigate to backup/snapshot section of hosting panel and trigger backup
- If automation fails at all tiers: log `status: "failed"` for hosting backup — non-fatal

**If both SSH and hosting panel fail:** log warning in `backup.json`, continue. BackWPup backup from Step 1 provides sufficient safety net.

### Output schema

```json
{
  "iteration": 1,
  "timestamp": "<ISO 8601>",
  "plugin_backup": {
    "path": "wp-content/uploads/backwpup-backups/backwpup-<timestamp>.zip",
    "status": "done|failed|skipped"
  },
  "ssh_backup": {
    "db_path": "/tmp/.wow-db-backup-1.sql",
    "files_path": "/tmp/.wow-files-backup-1.tar.gz",
    "uploads_excluded": false,
    "status": "done|failed|skipped"
  },
  "hosting_backup": {
    "method": "ssh|hostinger|browser|none",
    "status": "done|failed|skipped",
    "reason": "<only present when status is failed or skipped>"
  }
}
```

---

## Snapshot Step (per execution agent)

Each execution agent reads and stores current state at the very start of EXECUTE, before making any changes. All three agents write to the same `/tmp/.wow/iterations/N/snapshot.json` — each writes its own section; the orchestrator merges them.

### custom-agent snapshot

Reads the full content of every file it is about to modify:
- `/path/to/.htaccess`
- `/path/to/wp-config.php`
- `/path/to/wp-content/mu-plugins/wow-custom.php`

File paths are resolved from the site's document root (from `inventory.json`). Stored as full text content strings. If a file does not exist: stored as `null` (rollback will delete the file if WOW created it).

```json
"files": {
  "/var/www/html/.htaccess": "<full file content>",
  "/var/www/html/wp-config.php": "<full file content>",
  "/var/www/html/wp-content/mu-plugins/wow-custom.php": null
}
```

### plugin-agent snapshot

Reads the current plugin list before installing or activating anything:
```bash
wp plugin list --format=json
```

Stored as an array of `{ "name": "<slug>", "status": "active|inactive|must-use" }`.

```json
"plugins": [
  { "name": "litespeed-cache", "status": "inactive" },
  { "name": "autoptimize", "status": "active" }
]
```

If WP-CLI unavailable: use REST API (`GET /wp-json/wp/v2/plugins`).

### provider-agent snapshot

Reads current server and CDN settings before changing them via SSH:

```bash
# OPcache
php -r "echo json_encode(opcache_get_configuration());"

# PHP-FPM pm setting (from active pool config)
grep -E "^pm\s*=" /etc/php-fpm.d/*.conf 2>/dev/null | head -1

# Gzip — nginx
grep -rE "gzip\s+on" /etc/nginx/ 2>/dev/null | head -1

# Gzip — Apache
grep -rE "mod_deflate|AddOutputFilterByType DEFLATE" /etc/apache2/ /etc/httpd/ 2>/dev/null | head -1
```

For Hostinger/CDN panel values: read from the panel before changing via the same browser automation path used to change them.

```json
"server": {
  "opcache_enabled": false,
  "opcache_memory_consumption": 64,
  "php_fpm_pm": "dynamic",
  "gzip_enabled": false,
  "cdn_minify_enabled": false,
  "cdn_rocket_loader": false
}
```

If a value cannot be read (SSH unavailable, permission denied): store `null` for that key. Rollback skips `null` keys with a warning.

### Merged snapshot.json schema

```json
{
  "iteration": 1,
  "timestamp": "<ISO 8601>",
  "files": {
    "/path/to/.htaccess": "<content or null>",
    "/path/to/wp-config.php": "<content or null>",
    "/path/to/wp-content/mu-plugins/wow-custom.php": "<content or null>"
  },
  "plugins": [
    { "name": "<slug>", "status": "active|inactive|must-use" }
  ],
  "server": {
    "opcache_enabled": null,
    "opcache_memory_consumption": null,
    "php_fpm_pm": null,
    "gzip_enabled": null,
    "cdn_minify_enabled": null,
    "cdn_rocket_loader": null
  }
}
```

---

## Undo Mode (per execution agent)

When invoked with `mode: "rollback"` and a list of snapshots (from iterations T+1 through N, in reverse order), each agent reverses its changes.

### custom-agent undo

For each snapshot in reverse order (N → T+1), for each file in `snapshot.files`:
- If snapshot value is a string: write that content back to the path via SSH
- If snapshot value is `null`: delete the file (WOW created it from scratch)

After each file restore: verify site returns HTTP 200 (`curl -s -o /dev/null -w "%{http_code}" <site_url>`). If non-200: log failure, continue with remaining files.

### plugin-agent undo

Use the **earliest snapshot in the rollback range** (iteration T+1) as the target state — this represents the plugin state before any of the rolled-back iterations ran. Compare that snapshot's `plugins` array against current plugin state. For each plugin that was `inactive` in the T+1 snapshot but is now `active`: deactivate it.

```bash
wp plugin deactivate <slug>
```

Do not delete any plugin. Do not touch plugins that were already active before the rollback range began.

Note: Unlike custom-agent and provider-agent which process each iteration in reverse order, plugin-agent uses a single comparison against the earliest snapshot. This is correct because plugin deactivations are idempotent — it does not matter which specific iteration activated a plugin, only whether it should be active after rollback.

### provider-agent undo

For each key in `snapshot.server` with a non-null value: restore via SSH or hosting panel. Keys with `null` value: skip with warning in rollback report.

Examples:
- `opcache_enabled: false` → disable OPcache in php.ini / hosting panel
- `cdn_minify_enabled: false` → disable auto-minify via Cloudflare/CDN panel
- `php_fpm_pm: "dynamic"` → restore pm mode in PHP-FPM pool config

---

## Orchestrator Changes (`skills/wow/SKILL.md`)

### 1. Before EXECUTE — add backup + snapshot

After `### 5b. APPROVAL GATE` and before `### 5c. EXECUTE`:

```
**b2. BACKUP**: Dispatch `backup-agent`.
Save its output to `/tmp/.wow/iterations/N/backup.json`.
Non-blocking — proceed to EXECUTE regardless of backup outcome.
Log backup status to session.json under `backups[]`.

**b3. SNAPSHOT**: Each execution agent (custom-agent, plugin-agent, provider-agent)
runs its snapshot step at the start of EXECUTE automatically — no separate dispatch needed.
```

### 2. After visual regression — auto rollback prompt

After `**c2. VISUAL REGRESSION**` in the loop, if `visual-regression.json` has `status: "regression_flagged"`:

```
If visual regression was flagged: pause and present to user:
"⚠ Visual regression detected in iteration N (severity: <severity>).
  Judgment: <judgment>
  Roll back iteration N? (yes / no / show diff)"
- "yes": dispatch all three execution agents in undo mode for iteration N. Then continue loop.
- "no": continue loop without rollback.
- "show diff": display diff image path (or base64 in HTML context), then re-ask.
```

This prompt occurs even in `autonomy_mode: "autonomous"` — regression rollback always requires explicit confirmation.

### 3. New `/wow rollback` command

Add to the orchestrator as a recognized user command (checked at any point during the session):

```
/wow rollback

Ask: "Roll back to after which iteration? (current: N, options: 0 = full undo)"
User picks target iteration T (0 = before any WOW changes).
Confirm: "This will undo iterations T+1 through N. Continue? (yes/no)"
On yes:
  - Dispatch custom-agent, plugin-agent, provider-agent in undo mode
    with snapshots from iterations T+1 through N (in reverse order)
  - After completion: dispatch visual-regression-agent to verify site visually
  - Write results to /tmp/.wow/rollback-N.json
  - Emit rollback summary to terminal
```

### rollback-N.json schema

```json
{
  "rolled_back_from": 4,
  "rolled_back_to": 2,
  "timestamp": "<ISO 8601>",
  "file_restores": [
    { "path": "<path>", "status": "restored|deleted|failed" }
  ],
  "plugin_deactivations": [
    { "name": "<slug>", "status": "deactivated|failed|skipped" }
  ],
  "server_restores": [
    { "key": "opcache_enabled", "value": false, "status": "restored|failed|skipped" }
  ],
  "visual_check": "clean|regression_flagged|skipped",
  "partial_failure": false
}
```

`partial_failure: true` if any individual restore step failed. The rollback is considered complete even with partial failures — users are shown a summary of what succeeded and what didn't.

---

## Rollback Trigger Summary

| Trigger | Scope | Confirmation required |
|---|---|---|
| Automatic (regression flagged) | Current iteration only | Yes — always |
| `/wow rollback` command | User-chosen iteration range | Yes — always |

---

## Non-Goals

- Does not roll back database content changes (only DB schema/config, not post/page edits)
- Does not roll back changes made outside WOW (manual site edits between iterations)
- Does not delete installed plugins — deactivate only
- Does not automatically trigger rollback without user confirmation
- Does not block the optimization loop when backup fails
