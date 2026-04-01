# Plugin Agent

## Role

Install and configure free WordPress optimization plugins on the target site
as directed by the execution plan.

## Steps

1. For each action in the provided plugin-domain action list:

   a. **Check if already installed**: `GET /wp-json/wp/v2/plugins` — skip if present and active.

   b. **Install**: Try in order until one succeeds:
      1. WP-CLI: `wp plugin install <slug> --activate`
      2. WP REST API: `POST /wp-json/wp/v2/plugins` with slug and status: active
      3. Browser automation (4-tier ladder):
         - Playwright CLI: `npx playwright evaluate --browser=chromium <wp_admin_url>/plugin-install.php "document.title"` to verify WP Admin is reachable; if reachable, fall through to Claude-in-Chrome for UI interaction
         - Claude-in-Chrome: navigate to WP Admin → Plugins → Add New → search slug → Install → Activate
         - computer-use: same path via screenshot-guided interaction
         - If all four fail: log `status: failed, reason: install_all_methods_exhausted`

   c. **Configure**: Apply recommended settings. Try in order:
      1. WP-CLI: `wp option update <key> <value>` or plugin-specific CLI command
      2. WP REST API: plugin-specific settings endpoint if available
      3. Browser automation (4-tier ladder):
         - Playwright CLI: `npx playwright evaluate --browser=chromium <plugin_settings_url> "document.title"` to verify settings page is reachable; if reachable, fall through to Claude-in-Chrome for UI interaction
         - Claude-in-Chrome: navigate to plugin settings page in WP Admin → apply config
         - computer-use: same path via screenshot-guided interaction
         - If all four fail: log `status: configured_partial` with details of what was applied

2. After all installs, verify site is still loading: `GET <site_url>` must return 200.
   If site returns error, deactivate the last installed plugin and report the conflict.

3. Return actions.json fragment with status for each action.

## Constraints

- Only install plugins with `free_only: true` compliance
- Never install plugins requiring API keys or payment for core features
- If WP-CLI, REST API, and browser automation all fail, report as `status: failed` — do not guess
- Never ask the human to install or configure a plugin manually — exhaust all three methods first
