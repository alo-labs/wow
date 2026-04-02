# Plan Agent

## Role

Synthesize the latest audit into a ranked, conflict-free action list. Each action
is assigned to exactly one execution domain to prevent runtime conflicts.

## Steps

0. Read theme analysis and regression data (if present):

   **Theme analysis** (first iteration only):
   - Read `/tmp/.wow/theme-analysis-baseline.json`
   - If missing or `status: "skipped"`: skip theme/content gap discovery
   - If `status: "done"`: extract all findings with `severity: "high"` or `"medium"` as gaps
     to address. Low severity findings are added to plan only if no higher-priority gaps remain.

   **Visual regression** (iterations 2+):
   - Read `/tmp/.wow/iterations/N-1/visual-regression.json` (previous iteration's result)
   - If `status: "regression_flagged"`: read `/tmp/.wow/iterations/N-1/actions.json`,
     collect the actions that ran in that iteration, and add them to `regression_suspects`
     in the output plan.json. Do not exclude or revert these actions.
   - If file missing or `status` is not `"regression_flagged"`: no regression_suspects needed.

1. Read the provided audit.json. Identify performance gaps ordered by potential impact:
   - High impact: LCP > 2500ms, Performance score < 50, render-blocking resources
   - Medium impact: CLS > 0.1, INP > 200ms, unoptimized images, no caching
   - Low impact: missing compression, no CDN, database bloat

2. For each gap, follow the discovery ladder to find the best resource:
   a. Check wow-manifest.json for a known skill/MCP/WP plugin
   b. Search wp.org API for free plugins matching the gap keyword
   c. Search GitHub for Claude Code skills (topic: wordpress-optimization)
   d. Search npm for MCP servers matching the gap
   e. If no resource found, add to `unresolved_gaps`

3. Assign each action to exactly one domain:
   - `plugin`: actions that install or configure WordPress plugins
   - `provider`: actions requiring SSH, hosting panel, or server-level changes
   - `custom`: actions requiring direct file edits (htaccess, wp-config, PHP)
   - `theme`: actions modifying theme CSS/JS behavior (font-display, render-blocking scripts,
     stylesheet deferral) — implemented via mu-plugin CSS/JS overrides, never direct theme edits
   - `content`: actions fixing in-content markup (lazy loading, image dimensions, srcset) —
     implemented via WordPress filters in mu-plugin

   Example theme domain actions:
   - Add `font-display: swap` via mu-plugin: `add_action('wp_head', function(){ echo '<style>@font-face{font-display:swap}</style>'; });`
   - Defer non-critical theme stylesheets via `wp_enqueue_scripts` filter
   - Move render-blocking theme scripts to footer via `script_loader_tag` filter

   Example content domain actions:
   - Add `loading="lazy"` to content images via `the_content` filter
   - Add missing `width`/`height` to content images via `the_content` filter
   - Enable srcset via `wp_get_attachment_image_attributes` filter

4. If two actions would modify the same config surface, assign both to `custom`
   and sequence them as steps in a single custom action.

5. Return the complete plan.json schema (see wow-plan/SKILL.md for schema).
   Rank actions by expected_impact: high → medium → low.

   Theme/content actions ranked by severity:
   - high severity theme/content findings ranked above medium Lighthouse gaps
   - medium severity findings ranked with medium Lighthouse gaps
   - low severity findings ranked below all metric-based gaps

   Include `regression_suspects` array if regression was detected in the previous iteration:
   ```json
   "regression_suspects": [
     {
       "iteration": 2,
       "action": "<action description>",
       "regression_severity": "medium"
     }
   ]
   ```
