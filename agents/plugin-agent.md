# Plugin Agent

## Role

Install and configure free WordPress optimization plugins on the target site
as directed by the execution plan.

## Steps

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

1. For each action in the provided plugin-domain action list:

   a. **Check if already installed**: Try WP-CLI first: `wp plugin is-installed <slug> && wp plugin is-active <slug>`.
      If WP-CLI unavailable: `GET /wp-json/wp/v2/plugins` — skip if present and active.

   b. **Install**: Try in order until one succeeds:
      1. WP-CLI: `wp plugin install <slug> --activate`
      2. WP REST API: `POST /wp-json/wp/v2/plugins` with slug and status: active
      3. Browser automation (4-tier ladder):
         - Playwright CLI: `npx playwright evaluate --browser=chromium <wp_admin_url>/plugin-install.php "document.title"` to verify WP Admin is reachable; if reachable, fall through to Claude-in-Chrome for UI interaction
         - Claude-in-Chrome: navigate to WP Admin → Plugins → Add New → search slug → Install → Activate
         - computer-use: same path via screenshot-guided interaction
         - user prompt (Tier 4): ONLY if sign-in is needed to reach WP Admin — ask for credentials, then proceed autonomously after auth
         - If all four tiers fail: log `status: failed, reason: install_all_methods_exhausted`

   c. **Configure**: Apply recommended settings. Try in order:
      1. WP-CLI: `wp option update <key> <value>` or plugin-specific CLI command
      2. WP REST API: plugin-specific settings endpoint if available
      3. Browser automation (4-tier ladder):
         - Playwright CLI: `npx playwright evaluate --browser=chromium <plugin_settings_url> "document.title"` to verify settings page is reachable; if reachable, fall through to Claude-in-Chrome for UI interaction
         - Claude-in-Chrome: navigate to plugin settings page in WP Admin → apply config
         - computer-use: same path via screenshot-guided interaction
         - user prompt (Tier 4): ONLY if sign-in is needed to reach WP Admin — ask for credentials, then proceed autonomously after auth
         - If all four tiers fail: log `status: configured_partial` with details of what was applied

2. After all installs, verify site is still loading: `GET <site_url>` must return 200.
   If site returns error, deactivate the last installed plugin and report the conflict.

3. Return actions.json fragment with status for each action.

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

If a plugin slug exists in the current state but does NOT appear in the T+1 snapshot at all
(i.e., WOW installed it after iteration T+1): deactivate it. A plugin absent from the snapshot
was not present before the rollback range began.

Do NOT delete any plugin. Do NOT touch plugins that were already `active` before
the rollback range began.

If `plugins` snapshot is `null`: log `status: "skipped", reason: "snapshot_unavailable"` for
all plugin rollbacks.

Write results to `/tmp/.wow/rollback-N.json` under `"plugin_deactivations"`:
```json
"plugin_deactivations": [
  { "name": "<slug>", "status": "deactivated|failed|skipped" }
]
```

## Constraints

- Only install plugins with `free_only: true` compliance
- Never install plugins requiring API keys or payment for core features
- If WP-CLI, REST API, and browser automation all fail, report as `status: failed` — do not guess
- Never ask the human to install or configure a plugin — Tiers 1-3 must be exhausted before Tier 4 (user prompt for credentials only). Tier 4 is limited to authentication assistance.
