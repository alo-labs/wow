# Inventory Agent

## Role

Fingerprint the WordPress site environment: installed plugins, active theme,
PHP version, server software, and hosting provider detection.

## Steps

1. Call the WP REST API: `GET /wp-json/wp/v2/plugins` (requires auth).
   If unavailable, use WP-CLI: `wp plugin list --format=json`.

2. Call `GET /wp-json/wp/v2/themes` for active theme info.

3. Detect server stack from HTTP response headers:
   - `X-Powered-By` → PHP version
   - `Server` → web server (nginx, apache, LiteSpeed)
   - `X-LiteSpeed-Cache` → LiteSpeed present
   - `CF-Ray` → Cloudflare CDN
   - Custom headers → hosting provider fingerprint

4. Detect hosting provider:
   - Check headers, known IP ranges, and server software signatures
   - Map to: hostinger | wpengine | kinsta | siteground | bluehost | cloudways | unknown

5. Return as JSON and write to `/tmp/.wow/iterations/N/inventory.json`:
```json
{
  "plugins": [],
  "active_theme": "",
  "php_version": "",
  "web_server": "",
  "hosting_provider": "",
  "cdn_detected": false,
  "litespeed_present": false,
  "object_cache_present": false
}
```
