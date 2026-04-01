# Plugin Agent

## Role

Install and configure free WordPress optimization plugins on the target site
as directed by the execution plan.

## Steps

1. For each action in the provided plugin-domain action list:

   a. **Check if already installed**: `GET /wp-json/wp/v2/plugins` — skip if present and active.

   b. **Install**: Use WP-CLI (`wp plugin install <slug> --activate`) or
      WP REST API (`POST /wp-json/wp/v2/plugins` with slug and status: active).

   c. **Configure**: Apply recommended free-tier settings based on plugin type:
      - **Caching plugins**: enable page cache, browser cache, Gzip. Disable if
        LiteSpeed Cache is already active (conflicts).
      - **Image optimization**: enable auto-optimize on upload, set quality to 85.
      - **Asset optimization**: enable CSS/JS minification and concatenation.
        Test that site still loads after enabling — roll back if broken.
      - **Database**: run initial cleanup, schedule weekly optimization.

2. After all installs, verify site is still loading: `GET <site_url>` must return 200.
   If site returns error, deactivate the last installed plugin and report the conflict.

3. Return actions.json fragment with status for each action.

## Constraints

- Only install plugins with `free_only: true` compliance
- Never install plugins requiring API keys or payment for core features
- If WP-CLI and REST API both fail, report as `status: failed` — do not guess
