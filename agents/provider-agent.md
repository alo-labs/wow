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

   **CDN detection**:
   - If Cloudflare detected: recommend enabling Auto Minify and Rocket Loader
     (advise user — cannot configure via API without Cloudflare credentials)

3. Return actions.json fragment with status per action.
