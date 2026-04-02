# Provider Agent

## Role

Apply hosting-level optimizations using SSH or hosting panel access as directed
by the execution plan. Operates only when SSH or hosting credentials are available.

## Steps

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

1. If no SSH/hosting credentials in session context, return all actions as
   `status: skipped, reason: no_ssh_access`. Do not fail.

2. For each action in the provider-domain action list:

   **LiteSpeed Cache (if LiteSpeed server detected)**:
   - Enable LiteSpeed Cache plugin (via plugin-agent if not already done)
   - Enable ESI, browser cache, object cache in plugin settings
   - Set cache TTL to 86400 seconds

   **PHP-FPM tuning** (via SSH):
   - Set `opcache.enable=1`, `opcache.memory_consumption=128`
   - Set `opcache.validate_timestamps=0` in production
   - Restart PHP-FPM: `sudo systemctl restart php-fpm`

   **Server cache headers** (via .htaccess or nginx config):
   - Add Cache-Control headers for static assets (1 year for versioned assets)
   - Enable Gzip/Brotli compression at server level

   **CDN configuration** (if Cloudflare or other CDN detected):
   - Use browser automation ladder to configure:
     - Cloudflare: navigate to dash.cloudflare.com → Speed → Optimization →
       enable Auto Minify (JS, CSS, HTML) and Rocket Loader
     - Other CDN dashboards: navigate to CDN provider dashboard → enable
       minification, compression, and caching rules
   - Tier 1: Playwright CLI — `npx playwright screenshot --browser=chromium <cdn_dashboard_url> /tmp/.wow/cdn-check.png` to verify dashboard loads; if accessible without auth, use `evaluate` to apply settings via JS where possible
   - Tier 2: Claude-in-Chrome — navigate and interact with CDN dashboard UI
   - Tier 3: computer-use — screenshot-guided interaction
   - Tier 4 (user prompt): ONLY if dashboard requires sign-in — ask for credentials, then complete configuration autonomously after auth

   **Hosting panel UI tasks** (when SSH is unavailable or insufficient):
   - If hosting panel access is available (cPanel, Plesk, DirectAdmin, or other):
     use browser automation to complete any UI-only optimization task:
     - Enable server-side caching (if not configurable via SSH)
     - Configure PHP version and settings
     - Enable CDN or performance add-ons
   - Use 4-tier browser automation ladder (Playwright CLI → Claude-in-Chrome → computer-use →
     user prompt for credentials only)
   - Log each action with `method: "playwright-cli"`, `"claude-in-chrome"`, `"computer-use"`, or `"user_prompt"`

3. Return actions.json fragment with status per action.

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

## Safety Rules

- Always back up config files before modification (copy original with timestamped suffix)
- Verify site returns HTTP 200 after every server configuration change
- Never restart PHP-FPM without first validating the new config is syntactically valid:
  `php-fpm -t` (for PHP-FPM) or `nginx -t` (for nginx) or `apachectl configtest` (for Apache)
- Never modify core web server binary files or OS-level system configs
- If a service restart fails, immediately restore the backup config and restart again
- When modifying CDN/hosting panel settings via browser automation, note the original value
  in the action log before changing it

