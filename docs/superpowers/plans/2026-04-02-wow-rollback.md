# WOW Backup & Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full backup (BackWPup + SSH/hosting) and selective per-iteration rollback to the WOW optimization loop — each execution agent snapshots its own state before acting, and can reverse changes on demand or when a visual regression is detected.

**Architecture:** Self-snapshotting execution agents — each of the three execution agents (custom, plugin, provider) gains a snapshot step at the start of EXECUTE and an undo mode. A new backup-agent handles full BackWPup + SSH backups. The orchestrator gains a pre-EXECUTE backup/snapshot phase, a regression rollback prompt, and a `/wow rollback` on-demand command.

**Tech Stack:** Markdown (Claude Code agent/skill files), WP-CLI, SSH bash commands, BackWPup plugin

**Spec:** `docs/superpowers/specs/2026-04-02-wow-rollback-design.md`

---

## File Map

| File | Type | Change |
|---|---|---|
| `agents/backup-agent.md` | Markdown | **Create** — BackWPup + SSH/hosting full backup |
| `agents/custom-agent.md` | Markdown | **Modify** — add snapshot step + undo mode |
| `agents/plugin-agent.md` | Markdown | **Modify** — add snapshot step + undo mode |
| `agents/provider-agent.md` | Markdown | **Modify** — add snapshot step + undo mode |
| `skills/wow/SKILL.md` | Markdown | **Modify** — b2/b3 phases, regression rollback prompt, `/wow rollback` command |

---

## Task 1: Create `agents/backup-agent.md`

**Files:**
- Create: `agents/backup-agent.md`

- [ ] **Step 1: Write the agent file**

Create `agents/backup-agent.md` with this exact content:

```markdown
# Backup Agent

## Role

Take a full recoverable backup of the WordPress site before any optimization
changes are applied. Runs before every EXECUTE phase.

Writes `/tmp/.wow/iterations/N/backup.json`.

Non-blocking — failures are logged but never stop the optimization loop.

## Steps

### 1. Plugin backup (BackWPup)

Check if BackWPup is installed:
```bash
wp plugin is-installed backwpup
```

If not installed, install and activate:
```bash
wp plugin install backwpup --activate
```

If WP-CLI unavailable for install: use the 4-tier browser automation ladder
(Playwright CLI → Claude-in-Chrome → computer-use → user prompt for credentials only)
to install via WP Admin → Plugins → Add New → search "backwpup" → Install → Activate.

Trigger a full backup job. If no job exists, create one first:
```bash
wp backwpup job add --name="WOW-backup" --type="DB,FILE" --destination="FOLDER" --folder="wp-content/uploads/backwpup-backups/"
```

Start the job:
```bash
wp backwpup startjob <job_id>
```

Poll until done (check every 15 seconds, timeout after 5 minutes):
```bash
wp backwpup jobs
```

Record backup path and status in `backup.json`.

If BackWPup installation or backup fails: log `plugin_backup.status: "failed"` and continue.

### 2. SSH-first hosting backup

**If SSH available:**

Check uploads directory size:
```bash
du -sh <wp_root>/wp-content/uploads/
```

Export database:
```bash
wp db export /tmp/.wow-db-backup-N.sql
```

Archive WordPress files:
```bash
# If uploads <= 500MB: include uploads
tar -czf /tmp/.wow-files-backup-N.tar.gz <wp_root>

# If uploads > 500MB: exclude uploads
tar -czf /tmp/.wow-files-backup-N.tar.gz --exclude=<wp_root>/wp-content/uploads <wp_root>
```

Record both paths and `uploads_excluded` flag in `backup.json`.

**If SSH unavailable — hosting panel fallback:**

Use the 4-tier browser automation ladder to trigger a hosting panel snapshot:
- Hostinger: use `hostinger-agent` logic to trigger a manual backup from hPanel
  (navigate to hPanel → Backups → Create backup)
- Other providers: navigate to backup/snapshot section of hosting panel and trigger backup
- If automation fails at all tiers: log `hosting_backup.status: "failed"` — non-fatal

If both SSH and hosting panel fail: log warnings, continue.
BackWPup backup from Step 1 provides sufficient safety net.

### 3. Write output

Write to `/tmp/.wow/iterations/N/backup.json`:

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
```

- [ ] **Step 2: Verify file was created**

```bash
ls agents/backup-agent.md
```
Expected: file exists.

- [ ] **Step 3: Verify key sections present**

```bash
grep "BackWPup\|backwpup" agents/backup-agent.md | head -5
grep "backup.json" agents/backup-agent.md
grep "non-blocking\|Non-blocking\|non-fatal\|non_fatal" agents/backup-agent.md
```
Expected: matches for BackWPup install, backup.json output path, non-blocking language.

- [ ] **Step 4: Commit**

```bash
git add agents/backup-agent.md && git commit -m "$(cat <<'EOF'
feat: add backup-agent for BackWPup + SSH/hosting backup before EXECUTE

Installs BackWPup if missing, triggers full DB+files backup, falls back
to SSH archive or hosting panel snapshot. Non-blocking on failure.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add snapshot step + undo mode to `agents/custom-agent.md`

**Files:**
- Modify: `agents/custom-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/custom-agent.md`. The file has:
- `## Role` section
- `## Steps` with steps 1–3
- `## Safety Rules`

- [ ] **Step 2: Add snapshot step before Step 1**

Find the line:
```
1. For each action in the custom-domain action list:
```

Insert a new section immediately before it:

```markdown
## Snapshot Step

**Runs at the very start of EXECUTE, before making any changes.**

Read the full content of every file this agent is about to modify. Resolve paths
from `inventory.json` `document_root` field. Write to `/tmp/.wow/iterations/N/snapshot.json`
under the `"files"` key.

Files to snapshot:
- `<document_root>/.htaccess`
- `<document_root>/wp-config.php`
- `<document_root>/wp-content/mu-plugins/wow-custom.php`

For each file:
- If the file exists: read full content and store as a string
- If the file does not exist: store `null` (rollback will delete it if WOW creates it)

Read via SSH:
```bash
cat <document_root>/.htaccess
cat <document_root>/wp-config.php
cat <document_root>/wp-content/mu-plugins/wow-custom.php
```

If SSH unavailable: store `null` for all files with note `"ssh_unavailable": true`.

Write to snapshot.json (merging with existing content if plugin-agent or provider-agent
already wrote their sections):
```json
{
  "iteration": 1,
  "timestamp": "<ISO 8601>",
  "files": {
    "<document_root>/.htaccess": "<full content or null>",
    "<document_root>/wp-config.php": "<full content or null>",
    "<document_root>/wp-content/mu-plugins/wow-custom.php": "<full content or null>"
  }
}
```

```

- [ ] **Step 3: Add undo mode section after Step 3**

Find the line:
```
3. Return actions.json fragment with status per action.
```

Add immediately after it:

```markdown

## Undo Mode

When invoked with `mode: "rollback"` and a list of snapshots (from iterations T+1
through N, in reverse order — i.e., start with snapshot N, end with snapshot T+1):

For each snapshot in reverse order, for each file in `snapshot.files`:
- If snapshot value is a string: write that content back to the file path via SSH
  ```bash
  cat > <path> << 'WOWEOF'
  <snapshot content>
  WOWEOF
  ```
- If snapshot value is `null`: delete the file (WOW created it from scratch)
  ```bash
  rm -f <path>
  ```

After each file restore: verify site returns HTTP 200:
```bash
curl -s -o /dev/null -w "%{http_code}" <site_url>
```
If non-200: log `status: "failed"` for that file, continue with remaining files.

If SSH unavailable for a restore: log `status: "skipped", reason: "ssh_unavailable"`.

Write results to `/tmp/.wow/rollback-N.json` under `"file_restores"`:
```json
"file_restores": [
  { "path": "<path>", "status": "restored|deleted|failed|skipped" }
]
```
```

- [ ] **Step 4: Verify the edits**

Read `agents/custom-agent.md` and confirm:
- `## Snapshot Step` section exists before `## Steps`
- `## Undo Mode` section exists after Step 3
- Original Steps 1–3 and `## Safety Rules` are unchanged

```bash
grep "Snapshot Step\|Undo Mode\|snapshot.json\|rollback" agents/custom-agent.md
```
Expected: all four terms present.

- [ ] **Step 5: Commit**

```bash
git add agents/custom-agent.md && git commit -m "$(cat <<'EOF'
feat: add snapshot step and undo mode to custom-agent

Snapshots .htaccess, wp-config.php, and wow-custom.php before EXECUTE.
Undo mode restores from iteration snapshots in reverse order.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add snapshot step + undo mode to `agents/plugin-agent.md`

**Files:**
- Modify: `agents/plugin-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/plugin-agent.md`. The file has:
- `## Role` section
- `## Steps` with steps 1–3
- `## Constraints`

- [ ] **Step 2: Add snapshot step before Step 1**

Find:
```
1. For each action in the provided plugin-domain action list:
```

Insert a new section immediately before it:

```markdown
## Snapshot Step

**Runs at the very start of EXECUTE, before installing or activating anything.**

Read the current plugin list and store it. Write to `/tmp/.wow/iterations/N/snapshot.json`
under the `"plugins"` key (merging with existing content if other agents already wrote).

Read via WP-CLI:
```bash
wp plugin list --format=json
```

If WP-CLI unavailable: use REST API:
```bash
GET /wp-json/wp/v2/plugins
```

Store as an array of `{ "name": "<slug>", "status": "active|inactive|must-use" }`.

Write to snapshot.json:
```json
{
  "plugins": [
    { "name": "litespeed-cache", "status": "inactive" },
    { "name": "autoptimize", "status": "active" }
  ]
}
```

If both WP-CLI and REST API fail: store `"plugins": null` with note `"snapshot_failed": true`.

```

- [ ] **Step 3: Add undo mode section after Step 3**

Find:
```
3. Return actions.json fragment with status for each action.
```

Add immediately after it:

```markdown

## Undo Mode

When invoked with `mode: "rollback"` and a list of snapshots (for iterations T+1 through N):

Use the **earliest snapshot in the rollback range** (iteration T+1) as the target state.
This represents plugin state before any of the rolled-back iterations ran.

Compare that snapshot's `plugins` array against current plugin state:
```bash
wp plugin list --format=json
```

For each plugin that was `inactive` in the T+1 snapshot but is currently `active`:
deactivate it:
```bash
wp plugin deactivate <slug>
```

Do NOT delete any plugin. Do NOT touch plugins that were already `active` before
the rollback range — those were active before WOW ran and should remain active.

If `plugins` snapshot is `null`: log `status: "skipped", reason: "snapshot_unavailable"` for
all plugin rollbacks.

Write results to `/tmp/.wow/rollback-N.json` under `"plugin_deactivations"`:
```json
"plugin_deactivations": [
  { "name": "<slug>", "status": "deactivated|failed|skipped" }
]
```
```

- [ ] **Step 4: Verify the edits**

```bash
grep "Snapshot Step\|Undo Mode\|snapshot.json\|rollback" agents/plugin-agent.md
```
Expected: all four terms present.

Confirm `## Constraints` is unchanged.

- [ ] **Step 5: Commit**

```bash
git add agents/plugin-agent.md && git commit -m "$(cat <<'EOF'
feat: add snapshot step and undo mode to plugin-agent

Snapshots full plugin list before EXECUTE. Undo mode deactivates
plugins that WOW activated, using earliest snapshot in rollback range.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add snapshot step + undo mode to `agents/provider-agent.md`

**Files:**
- Modify: `agents/provider-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/provider-agent.md`. The file has:
- `## Role` section
- `## Steps` with steps 1–3

- [ ] **Step 2: Add snapshot step before Step 1**

Find:
```
1. If no SSH/hosting credentials in session context, return all actions as
```

Insert a new section immediately before it:

```markdown
## Snapshot Step

**Runs at the very start of EXECUTE, before changing any server settings.**

Read current server and CDN settings via SSH. Write to `/tmp/.wow/iterations/N/snapshot.json`
under the `"server"` key (merging with existing content if other agents already wrote).

If SSH unavailable: store `"server": null` and continue — rollback will skip server
restores with a warning.

Read values:
```bash
# OPcache enabled and memory
php -r "echo json_encode(opcache_get_configuration());"

# PHP-FPM pm setting
grep -E "^pm\s*=" /etc/php-fpm.d/*.conf 2>/dev/null | head -1

# Gzip — nginx
grep -rE "gzip\s+on" /etc/nginx/ 2>/dev/null | head -1

# Gzip — Apache
grep -rE "mod_deflate|AddOutputFilterByType DEFLATE" /etc/apache2/ /etc/httpd/ 2>/dev/null | head -1
```

For CDN/hosting panel values (Cloudflare auto-minify, Rocket Loader, etc.): read the
current setting from the panel using the same browser automation path used to change
them (Playwright CLI → Claude-in-Chrome → computer-use). Store `null` for any value
that cannot be read.

Write to snapshot.json:
```json
{
  "server": {
    "opcache_enabled": false,
    "opcache_memory_consumption": 64,
    "php_fpm_pm": "dynamic",
    "gzip_enabled": false,
    "cdn_minify_enabled": false,
    "cdn_rocket_loader": false
  }
}
```

Store `null` for any key that could not be read.

```

- [ ] **Step 3: Add undo mode section after Step 3**

Find:
```
3. Return actions.json fragment with status per action.
```

Add immediately after it:

```markdown

## Undo Mode

When invoked with `mode: "rollback"` and a list of snapshots (for iterations T+1 through N,
in reverse order):

For each snapshot in reverse order, for each key in `snapshot.server`:
- If the value is `null`: skip with warning `"skipped — no snapshot value"`
- If the value is non-null: restore via SSH or hosting panel

Restore commands by key:
- `opcache_enabled: false` → set `opcache.enable=0` in php.ini and restart PHP-FPM:
  `sudo systemctl restart php-fpm`
- `opcache_enabled: true` → set `opcache.enable=1` in php.ini and restart PHP-FPM
- `opcache_memory_consumption: N` → set `opcache.memory_consumption=N` in php.ini and restart PHP-FPM
- `php_fpm_pm: "dynamic"` → restore pm setting in active pool config and restart PHP-FPM
- `gzip_enabled: false` → disable gzip in nginx (`gzip off;`) or Apache (comment out mod_deflate) and reload
- `cdn_minify_enabled: false` → disable auto-minify via CDN panel (same browser automation path as EXECUTE)
- `cdn_rocket_loader: false` → disable Rocket Loader via Cloudflare panel

If `server` snapshot is `null`: log `status: "skipped", reason: "no_ssh_access"` for
all server rollbacks.

Write results to `/tmp/.wow/rollback-N.json` under `"server_restores"`:
```json
"server_restores": [
  { "key": "opcache_enabled", "value": false, "status": "restored|failed|skipped" }
]
```
```

- [ ] **Step 4: Verify the edits**

```bash
grep "Snapshot Step\|Undo Mode\|snapshot.json\|rollback" agents/provider-agent.md
```
Expected: all four terms present.

- [ ] **Step 5: Commit**

```bash
git add agents/provider-agent.md && git commit -m "$(cat <<'EOF'
feat: add snapshot step and undo mode to provider-agent

Snapshots OPcache, PHP-FPM, gzip, and CDN settings before EXECUTE.
Undo mode restores server settings from snapshots in reverse iteration order.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire backup + rollback into `skills/wow/SKILL.md`

**Files:**
- Modify: `skills/wow/SKILL.md`

- [ ] **Step 1: Read the current file**

Read `skills/wow/SKILL.md`. Locate:
1. The `**b. APPROVAL GATE**` block and `**c. EXECUTE**` line
2. The `**c2. VISUAL REGRESSION**` block
3. The `## Error Handling` section at the bottom

- [ ] **Step 2: Add b2 BACKUP and b3 SNAPSHOT phases before EXECUTE**

Find:
```
**c. EXECUTE**: Invoke `@wow-execute`. Save executed actions to `/tmp/.wow/iterations/N/actions.json`.
```

Insert immediately before it:

```markdown
**b2. BACKUP**: Dispatch `backup-agent`.
Save its output to `/tmp/.wow/iterations/N/backup.json`.
Log backup status to `session.json` under `backups[]`:
`{ "iteration": N, "status": "done|partial|failed" }`.
Non-blocking — proceed to EXECUTE regardless of backup outcome.

**b3. SNAPSHOT**: Each execution agent (custom-agent, plugin-agent, provider-agent) runs
its snapshot step automatically at the start of EXECUTE — no separate dispatch needed.
Each agent merges its section into `/tmp/.wow/iterations/N/snapshot.json`.

```

- [ ] **Step 3: Add regression rollback prompt after c2**

Find:
```
**c2. VISUAL REGRESSION**: Dispatch `visual-regression-agent`.
Save its output to `/tmp/.wow/iterations/N/visual-regression.json`.
Non-blocking — proceed to VERIFY regardless of result.
```

Replace with:

```markdown
**c2. VISUAL REGRESSION**: Dispatch `visual-regression-agent`.
Save its output to `/tmp/.wow/iterations/N/visual-regression.json`.
Non-blocking — proceed to VERIFY regardless of result.

If `visual-regression.json` has `status: "regression_flagged"`:
Pause and present to user (even in `autonomy_mode: "autonomous"` — always requires confirmation):

"⚠ Visual regression detected in iteration N (severity: <severity>).
  Judgment: <judgment>
  Roll back iteration N? (yes / no / show diff)"

- "yes": dispatch custom-agent, plugin-agent, provider-agent in `mode: "rollback"` with
  the snapshot from iteration N. Write results to `/tmp/.wow/rollback-N.json`. Then continue loop.
- "no": continue loop without rollback.
- "show diff": display `diff_image_path` from `visual-regression.json`, then re-ask.
```

- [ ] **Step 4: Add `/wow rollback` command to Error Handling section**

Find `## Error Handling` at the end of the file. Add a new section immediately after it:

```markdown

## /wow rollback Command

At any point during the session, if the user types `/wow rollback`:

1. Read `session.json` to get `current_iteration` (N).

2. Ask:
   "Roll back to after which iteration? Current: N. Enter a number (0 = undo everything WOW did):"

3. Wait for user input T.

4. Confirm:
   "This will undo iterations T+1 through N. Proceed? (yes/no)"

5. On "yes":
   - Dispatch custom-agent, plugin-agent, provider-agent simultaneously in `mode: "rollback"`
     with snapshots from iterations T+1 through N (in reverse order — pass all snapshot
     file paths; each agent uses the range as described in its own undo mode spec).
   - Wait for all three agents to complete.
   - Dispatch `visual-regression-agent` to verify site visually post-rollback.
   - Write results to `/tmp/.wow/rollback-N.json`:
     ```json
     {
       "rolled_back_from": N,
       "rolled_back_to": T,
       "timestamp": "<ISO 8601>",
       "file_restores": [],
       "plugin_deactivations": [],
       "server_restores": [],
       "visual_check": "clean|regression_flagged|skipped",
       "partial_failure": false
     }
     ```
     `partial_failure: true` if any individual restore step failed.
   - Emit rollback summary to terminal.

6. On "no": return to normal session state without changes.
```

- [ ] **Step 5: Verify the edits**

```bash
grep "b2\. BACKUP\|b3\. SNAPSHOT\|backup-agent" skills/wow/SKILL.md
grep "regression_flagged\|Roll back iteration\|rollback" skills/wow/SKILL.md | head -10
grep "wow rollback\|/wow rollback" skills/wow/SKILL.md
```
Expected: all three greps return matches.

Confirm all existing steps (1, 1b, 2, 3, 4, 5a, 5b, 5c, 5c2, 5d, 6, 7) are unchanged.

- [ ] **Step 6: Commit**

```bash
git add skills/wow/SKILL.md && git commit -m "$(cat <<'EOF'
feat: wire backup-agent and rollback into wow orchestrator

Adds b2 (BACKUP) and b3 (SNAPSHOT) phases before EXECUTE. Adds regression
rollback prompt after visual regression check. Adds /wow rollback on-demand
command with per-iteration range selection and visual verification.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Validation

**Files:**
- Read: `scripts/validate-plugin.sh`

- [ ] **Step 1: Run validation script**

```bash
ls scripts/validate-plugin.sh && bash scripts/validate-plugin.sh
```
Expected: all checks pass. Fix any failures before continuing.

- [ ] **Step 2: Verify all new/modified files**

```bash
ls agents/backup-agent.md
```
Expected: file exists.

```bash
grep "Snapshot Step" agents/custom-agent.md agents/plugin-agent.md agents/provider-agent.md
```
Expected: 3 matches (one per agent).

```bash
grep "Undo Mode" agents/custom-agent.md agents/plugin-agent.md agents/provider-agent.md
```
Expected: 3 matches.

```bash
grep "backup-agent\|b2\. BACKUP" skills/wow/SKILL.md
```
Expected: matches in SKILL.md.

```bash
grep "wow rollback\|/wow rollback" skills/wow/SKILL.md
```
Expected: at least 1 match.

```bash
grep "rollback-N.json\|rollback_suspects\|rolled_back_from" skills/wow/SKILL.md agents/custom-agent.md agents/plugin-agent.md agents/provider-agent.md
```
Expected: matches across files.

- [ ] **Step 3: Commit only if validation required fixes**

Only commit if fixes were needed during validation.
