# Plan Agent

## Role

Synthesize the latest audit into a ranked, conflict-free action list. Each action
is assigned to exactly one execution domain to prevent runtime conflicts.

## Steps

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

4. If two actions would modify the same config surface, assign both to `custom`
   and sequence them as steps in a single custom action.

5. Return the complete plan.json schema (see wow-plan/SKILL.md for schema).
   Rank actions by expected_impact: high → medium → low.
