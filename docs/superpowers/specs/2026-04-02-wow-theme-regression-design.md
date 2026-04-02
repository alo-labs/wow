# WOW — Theme Analysis & Visual Regression Design

**Plugin**: WOW (WordPress → Optimized WordPress)
**Author**: Shafqat Ullah <shafqat@sourcevo.com>
**Organization**: Ālo Labs (https://alolabs.dev)
**Repo**: alolabs/wow
**Date**: 2026-04-02
**Sub-project**: 6 of N — Theme Analysis & Visual Regression

---

## Overview

This sub-project adds two new agents to the WOW optimization loop:

1. **`theme-analysis-agent`** — identifies theme- and content-level performance pathologies at baseline and final iteration. Covers render-blocking resources, stylesheet bloat, web font loading strategy, DOM size, and content image issues.

2. **`visual-regression-agent`** — runs after every EXECUTE to compare before/after screenshots. Uses ImageMagick pixel diff as a fast filter; when diff exceeds threshold, Claude inspects both images and judges whether the change is an expected improvement or a true regression.

Both agents are non-blocking. Findings accumulate in state files and surface in the final report. The optimization loop never stops due to theme findings or visual regressions — issues are flagged, not acted on autonomously.

---

## Architecture

```
New files:
  agents/theme-analysis-agent.md     ← page/theme/content analysis (baseline + final)
  agents/visual-regression-agent.md  ← before/after diff check (every iteration)

Modified:
  skills/wow/SKILL.md                ← two dispatch points added to orchestration loop
  agents/plan-agent.md               ← reads theme-analysis.json; adds theme/content action categories
  agents/report-agent.md             ← adds Theme Analysis section + Visual Regression Log
  scripts/install.sh                 ← add ImageMagick install step
```

### State files

| File | Written by | When |
|---|---|---|
| `/tmp/.wow/theme-analysis-baseline.json` | theme-analysis-agent | After baseline audit (iteration 0) |
| `/tmp/.wow/iterations/N/theme-analysis-final.json` | theme-analysis-agent | After final iteration audit |
| `/tmp/.wow/iterations/N/visual-regression.json` | visual-regression-agent | After each EXECUTE |
| `/tmp/.wow/iterations/N/diff.png` | visual-regression-agent | When ImageMagick diff runs |

Note: `N` throughout this spec is a placeholder for the current iteration number (e.g. `/tmp/.wow/iterations/3/diff.png`).

### Orchestrator changes

Three additions to `skills/wow/SKILL.md`. References to existing step headings in that file:

1. **After `### 4. Run AUDIT phase (first baseline)` completes:** dispatch `theme-analysis-agent` → save output to `/tmp/.wow/theme-analysis-baseline.json`

2. **After `### 5c. EXECUTE` completes, before `### 5d. VERIFY`:** dispatch `visual-regression-agent` → save output to `/tmp/.wow/iterations/N/visual-regression.json`

3. **After the final iteration's re-audit** (which already runs as part of the VERIFY → delta.json → `stop: true` cycle — no new audit step needed): dispatch `theme-analysis-agent` → save output to `/tmp/.wow/iterations/N/theme-analysis-final.json`. The final re-audit is the existing `@wow-audit` invocation in the loop. The third dispatch point is added immediately after it when `delta.json` has `stop: true`.

---

## Theme Analysis Agent

### Role

Identify theme- and content-level performance pathologies by fetching the live page and analyzing its resource graph, DOM structure, and image attributes.

### When it runs

- After baseline audit (iteration 0) → writes `/tmp/.wow/theme-analysis-baseline.json`
- After final iteration audit (loop exit) → writes `/tmp/.wow/iterations/N/theme-analysis-final.json`

### Detection categories

| Category | Signals detected |
|---|---|
| Render-blocking resources | CSS/JS in `<head>` without `async`, `defer`, or `preload`; stylesheets blocking first paint |
| Stylesheet bloat | Total CSS bytes; number of stylesheets; theme-owned vs plugin-owned breakdown |
| Web font loading | `@font-face` without `font-display: swap`; Google Fonts blocking render; multiple font foundries loaded |
| DOM size | Total node count; maximum nesting depth; Lighthouse threshold is >1500 nodes = high severity |
| Content image issues | `<img>` without `width`/`height` attributes (CLS source); missing `loading="lazy"` on below-fold images; no `srcset` on large images |

### How it works

1. Write a temporary Node.js script to `/tmp/.wow/theme-analysis-extract.js` that uses the Playwright API to:
   - Navigate to `<site_url>`
   - Extract: all `<link>` and `<script>` tags in `<head>` with their attributes; total DOM node count and max nesting depth; all `<img>` tags with `src`, `width`, `height`, `loading`, `srcset` attributes; all loaded stylesheet URLs
   - Return the result as JSON to stdout

   Run the script:
   ```bash
   node /tmp/.wow/theme-analysis-extract.js
   ```

   Delete the temp script after use.

2. Read `/tmp/.wow/iterations/N/inventory.json` (or `/tmp/.wow/baseline.json` for the baseline run) to get the active theme slug — used to classify stylesheet ownership (theme-owned vs plugin-owned).

3. Fetch each theme-owned CSS URL and measure byte size. Save the CSS text per URL for use in Step 4's font-display check:
   ```bash
   curl -s --max-time 10 -o /tmp/.wow/theme-css-tmp.css "<url>"
   wc -c < /tmp/.wow/theme-css-tmp.css
   ```
   Delete temp file when done with each stylesheet.

4. Search each fetched CSS file for the `font-display` keyword to detect missing `font-display: swap` declarations. Classify each finding by severity:
   - `high`: render-blocking stylesheet, >1500 DOM nodes, font blocking render
   - `medium`: missing `font-display: swap` (detected by searching fetched CSS for `font-display`), stylesheet >100 KB, multiple font foundries, missing `loading="lazy"` on images
   - `low`: missing `srcset`, missing image dimensions, stylesheet >50 KB

5. Write output JSON.

### Output schema

The top-level `status` field is always present:
- `"done"` — analysis completed normally
- `"skipped"` — no browser tool available (see graceful degradation)

```json
{
  "status": "done|skipped",
  "reason": "<only present when status is skipped>",
  "site_url": "<url>",
  "timestamp": "<ISO 8601>",
  "render_blocking": [
    {
      "type": "stylesheet|script",
      "url": "<url>",
      "owner": "theme|plugin|unknown",
      "severity": "high|medium|low"
    }
  ],
  "stylesheet_bloat": {
    "count": 0,
    "theme_bytes": 0,
    "theme_bytes_note": "only theme-owned stylesheets are fetched; plugin/unknown bytes are not measured"
  },
  "font_issues": [
    {
      "issue": "missing_font_display_swap|blocking_google_fonts|multiple_foundries",
      "url": "<url>",
      "severity": "high|medium|low"
    }
  ],
  "dom_size": {
    "node_count": 0,
    "max_depth": 0,
    "severity": "low|medium|high"
  },
  "content_images": [
    {
      "src": "<url>",
      "issue": "missing_lazy|missing_dimensions|no_srcset",
      "severity": "medium|low"
    }
  ],
  "summary": {
    "high": 0,
    "medium": 0,
    "low": 0
  }
}
```

### Graceful degradation

**Browser automation ladder for this agent (2-tier — DOM extraction only):**

`computer-use` and user prompt are intentionally excluded: computer-use cannot return structured DOM data programmatically, and user prompt is inappropriate for automated analysis. Only tiers that can execute JavaScript and return structured output are used.

- **Tier 1 — Node.js + Playwright script** (as described above): full extraction
- **Tier 2 — Claude-in-Chrome**: navigate to `<site_url>`, use `mcp__Claude_in_Chrome__javascript_tool` to run equivalent JS expressions and return results
- **If both unavailable**: write `{ "status": "skipped", "reason": "no_browser_tool_available" }` — non-blocking

Additional degradation:
- If inventory.json is missing: skip theme-owned classification; mark all owners as `unknown`
- If a CSS fetch fails: record `theme_bytes: null` for that stylesheet

---

## Visual Regression Agent

### Role

Compare before/after screenshots for each iteration to detect visual regressions introduced by WOW's own changes. Non-blocking — the loop continues regardless of outcome.

### When it runs

After every EXECUTE (`### 5c. EXECUTE` in `skills/wow/SKILL.md`), before VERIFY.

### How it works

1. Read `/tmp/.wow/iterations/N/screenshot-before.json` and `/tmp/.wow/iterations/N/screenshot-after.json` — get both image paths.

2. If either screenshot is missing or has `status: "skipped"`: write `{ "status": "skipped", "reason": "screenshot_unavailable" }` and exit.

3. Check ImageMagick availability and install if needed (see below). If unavailable after install attempt: skip to step 5 with `pixel_diff: "skipped"`.

4. Run pixel diff via ImageMagick:
   ```bash
   compare -metric AE -fuzz 5% <before.png> <after.png> /tmp/.wow/iterations/N/diff.png 2>&1
   ```
   Compute `diff_pct = changed_pixels / total_pixels * 100`.

5. If `diff_pct <= 5%` (or pixel diff was skipped and Claude judges no significant change): write `{ "status": "clean" }` — done.

6. If `diff_pct > 5%` (threshold is strictly greater than 5): Claude reads both screenshots visually and judges:
   - **Expected change**: layout improved — content reflow from image optimization, plugin UI removed, debug bar hidden → `status: "expected_change"`
   - **Regression**: broken layout, missing elements, overlapping content, color corruption, navigation collapsed → `status: "regression_flagged"`

7. Write output JSON.

### ImageMagick availability

Check at agent startup:
```bash
command -v compare >/dev/null 2>&1
```

If not found, install:
```bash
brew install imagemagick 2>/dev/null || apt-get install -y imagemagick 2>/dev/null || echo "imagemagick_install_failed"
```

If install fails: skip pixel diff step entirely and proceed directly to Claude visual comparison of both screenshots. Log `{ "pixel_diff": "skipped", "reason": "imagemagick_unavailable" }`.

### Output schema

```json
{
  "iteration": 1,
  "status": "clean|expected_change|regression_flagged|skipped",
  "diff_pct": 3.2,
  "diff_image_path": "/tmp/.wow/iterations/1/diff.png",
  "judgment": "<Claude's description of what changed>",
  "severity": "none|low|medium|high",
  "pixel_diff": "done|skipped"
}
```

Note: `diff_image_path` is the absolute local path to the ImageMagick diff image (e.g., `/tmp/.wow/iterations/3/diff.png`). Only present when `pixel_diff: "done"`.

Severity mapping:
- `none`: clean or expected_change with diff_pct < 10%
- `low`: expected_change with diff_pct >= 10%
- `medium`: regression_flagged with diff_pct > 5% and <= 20%
- `high`: regression_flagged with diff_pct > 20%

---

## Plan Agent Changes

### New inputs

- Read `/tmp/.wow/theme-analysis-baseline.json` on the first iteration (if present and `status: "done"`)
- Read `/tmp/.wow/iterations/N-1/visual-regression.json` on iterations 2+ (previous iteration's result, if present)

Note: the plan agent reads the **previous** iteration's visual-regression.json (N-1), not the current one. The current iteration's regression check runs after EXECUTE, which happens after PLAN. The plan for iteration N uses regression data from iteration N-1 to inform `regression_suspects`.

### New action categories

Two new domains added to the ranked action list:

**`theme` domain** (actions requiring theme CSS/JS modification):
- Add `font-display: swap` to theme stylesheet via child theme or mu-plugin CSS override
- Defer non-critical theme stylesheets via WordPress `wp_enqueue_scripts` filter in mu-plugin
- Remove render-blocking theme scripts via `script_loader_tag` filter

**`content` domain** (actions targeting in-content markup):
- Add `loading="lazy"` to content images via `the_content` filter in mu-plugin
- Add missing `width`/`height` attributes to content images via `the_content` filter
- Add `srcset` generation via WordPress `wp_get_attachment_image_attributes` filter

### Gap priority

Theme/content findings from `theme-analysis-baseline.json` are ranked by severity using the same impact ordering as existing gaps:
- `high` severity findings ranked above `medium` Lighthouse gaps
- `medium` severity findings ranked with `medium` Lighthouse gaps (by expected LCP/CLS impact)
- `low` severity findings ranked below all metric-based gaps

### Regression awareness

If `/tmp/.wow/iterations/N-1/visual-regression.json` has `status: "regression_flagged"`:
- Read `/tmp/.wow/iterations/N-1/actions.json` — this file is written by the execute phase's `custom-agent`, `plugin-agent`, and `provider-agent` (see existing agent specs) — to identify which actions ran in that iteration
- Add them to a `regression_suspects` array in `plan.json`
- The plan agent does not exclude or revert these actions — flagging only

### Updated plan.json schema additions

```json
{
  "actions": [],
  "unresolved_gaps": [],
  "regression_suspects": [
    {
      "iteration": 2,
      "action": "<action description>",
      "regression_severity": "medium"
    }
  ]
}
```

---

## Report Agent Changes

### New section: Theme & Content Analysis

Shown when `theme-analysis-baseline.json` exists and has `status: "done"`. Compares baseline vs final findings.

```
## Theme & Content Analysis
| Finding               | Baseline | Final  | Status   |
|-----------------------|----------|--------|----------|
| Render-blocking CSS   | 4        | 1      | ✓ fixed  |
| Stylesheet bloat      | 148 KB   | 82 KB  | ✓ fixed  |
| Font display issues   | 2        | 0      | ✓ fixed  |
| DOM node count        | 2,847    | 2,847  | — same   |
| Content image issues  | 12       | 3      | ✓ fixed  |
```

If final analysis was not run (loop stopped early or `theme-analysis-final.json` absent): show baseline findings only with note "Final analysis not run — loop exited before completion."

If `theme-analysis-baseline.json` is missing or has `status: "skipped"`: omit section entirely.

### New section: Visual Regression Log

Shown when any iteration has `status != "clean"` and `status != "skipped"`.

```
## Visual Regression Log
| Iteration | Status            | Diff % | Judgment                              |
|-----------|-------------------|--------|---------------------------------------|
| 2         | expected_change   | 7.1%   | Debug bar removed — expected          |
| 4         | regression_flagged| 12.3%  | Header nav collapsed — investigate    |
```

If all iterations are clean: single line "No visual regressions detected across N iterations."

In the HTML report: each `regression_flagged` row includes a collapsible `<details>` element. The diff image is embedded as a base64 data URI (`<img src="data:image/png;base64,...">`), since `file://` paths to `/tmp/` are not served by browsers. The report agent reads the diff PNG from `diff_image_path`, base64-encodes it, and inlines it.

---

## install.sh Changes

Add ImageMagick install step after the Playwright CLI section:

```bash
echo ""
echo "--- Installing ImageMagick (for visual regression diff) ---"

command -v compare >/dev/null 2>&1 \
  && echo "  ✓ imagemagick already installed" \
  || (brew install imagemagick 2>/dev/null \
      || apt-get install -y imagemagick 2>/dev/null \
      || echo "  ⚠ imagemagick install failed (non-fatal — visual diff will use Claude vision fallback)")
```

---

## Graceful Degradation Summary

| Condition | Behavior |
|---|---|
| Node.js/Playwright script fails for theme analysis | Fall through to Claude-in-Chrome JS execution |
| Both browser tools unavailable | Skip theme analysis; write `{ "status": "skipped" }` |
| ImageMagick not installed + install fails | Skip pixel diff; Claude compares screenshots directly |
| Before/after screenshots missing or skipped | Skip visual regression for that iteration; write `{ "status": "skipped" }` |
| `theme-analysis-baseline.json` missing or skipped | Plan agent skips theme/content gap discovery; report omits section |
| Loop exits before final audit | Report shows baseline theme analysis only with note |

---

## Non-Goals

- Does not auto-rollback changes when regression is detected
- Does not pause the loop when regression is detected (superseded by sub-project 7: rollback spec adds a user-confirmation pause for regression_flagged, but never pauses autonomously)
- Does not analyze theme PHP logic or server-side rendering performance
- Does not compare CSS files directly — works from the rendered page only
- Does not replace Lighthouse — adds to it, never replaces it
