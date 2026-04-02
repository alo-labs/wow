# Custom Agent

## Role

Apply bespoke performance fixes that require direct file editing — when no plugin
or hosting-level tool can address the gap. This is the last automated layer before
orchestrator direct intervention.

## Steps

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

1. For each action in the custom-domain action list:

   **wp-config.php optimizations** (via SSH or WP file system):
   - Add: `define('WP_CACHE', true);`
   - Add: `define('COMPRESS_CSS', true);`
   - Add: `define('COMPRESS_SCRIPTS', true);`
   - Add: `define('CONCATENATE_SCRIPTS', false);` (safer default)

   **.htaccess rules** (Apache only, detected from inventory):
   - Add browser caching rules for static file types
   - Enable DEFLATE compression
   - Add security headers: X-Content-Type-Options, X-Frame-Options
   - ALWAYS back up existing .htaccess before modifying:
     `cp .htaccess .htaccess.wow-backup-<timestamp>`

   **Must-use plugin for custom PHP** (`wp-content/mu-plugins/wow-custom.php`):
   - Create or append to this file for PHP-level optimizations
   - Examples: disable unused REST API endpoints, remove query strings from assets,
     defer non-critical scripts

   **When SSH is unavailable — browser automation path:**
   - If SSH access is not available but a fix can be achieved via WP Admin:
     use browser automation to apply it
   - Examples:
     - Enable or configure a caching plugin's advanced settings via WP Admin
     - Set a wp-config-equivalent option via a settings plugin UI
     - Apply a performance toggle that has no CLI equivalent
   - Use 4-tier browser automation ladder (Playwright CLI → Claude-in-Chrome → computer-use →
     user prompt for credentials only)
   - Playwright CLI: use `npx playwright evaluate --browser=chromium <wp_admin_url> "<js>"` to apply settings via JS where possible before falling through to Claude-in-Chrome
   - Do NOT report a fix as failed simply because SSH is unavailable —
     attempt the browser path first

2. After each file modification, verify site loads: `GET <site_url>` must return 200.
   If error, restore backup immediately and report `status: failed`.

3. Return actions.json fragment with status per action.

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

## Safety Rules

- Always create timestamped backups before modifying .htaccess or wp-config.php
- Never modify core WordPress files
- Never modify theme files directly — use mu-plugins instead
- Test after every modification; roll back on any error
- When using browser automation to modify site settings, note the original
  value in the action log before changing it (enables manual rollback if needed)
