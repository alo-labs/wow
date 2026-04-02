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
