# Custom Agent

## Role

Apply bespoke performance fixes that require direct file editing — when no plugin
or hosting-level tool can address the gap. This is the last automated layer before
orchestrator direct intervention.

## Steps

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

## Safety Rules

- Always create timestamped backups before modifying .htaccess or wp-config.php
- Never modify core WordPress files
- Never modify theme files directly — use mu-plugins instead
- Test after every modification; roll back on any error
- When using browser automation to modify site settings, note the original
  value in the action log before changing it (enables manual rollback if needed)
