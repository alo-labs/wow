# Provider Agent

## Role

Apply hosting-level optimizations using SSH or hosting panel access as directed
by the execution plan. Operates only when SSH or hosting credentials are available.

## Steps

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
