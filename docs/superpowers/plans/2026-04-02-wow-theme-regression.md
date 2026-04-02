# WOW Theme Analysis & Visual Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add theme/content performance analysis (render-blocking resources, stylesheet bloat, font loading, DOM size, content images) and per-iteration visual regression detection to the WOW optimization loop.

**Architecture:** Two new agent files plus targeted edits to four existing files. `theme-analysis-agent` runs at baseline and final iteration via a Node.js+Playwright script. `visual-regression-agent` runs after every EXECUTE using ImageMagick pixel diff + Claude visual judgment. Plan agent gains two new action domains (theme, content). Report agent gains two new sections. All agents are non-blocking.

**Tech Stack:** Markdown (Claude Code agent/skill files), Node.js + Playwright API (page extraction), ImageMagick `compare` (pixel diff), bash (install.sh)

**Spec:** `docs/superpowers/specs/2026-04-02-wow-theme-regression-design.md`

---

## File Map

| File | Type | Change |
|---|---|---|
| `agents/theme-analysis-agent.md` | Markdown | **Create** — theme/content analysis agent |
| `agents/visual-regression-agent.md` | Markdown | **Create** — pixel diff + Claude visual judgment |
| `skills/wow/SKILL.md` | Markdown | **Modify** — add 3 dispatch points to Step 4 and Step 5 |
| `agents/plan-agent.md` | Markdown | **Modify** — add theme/content inputs + new action domains |
| `agents/report-agent.md` | Markdown | **Modify** — add Theme Analysis + Visual Regression Log sections |
| `scripts/install.sh` | Bash | **Modify** — add ImageMagick install step |

---

## Task 1: Create `agents/theme-analysis-agent.md`

**Files:**
- Create: `agents/theme-analysis-agent.md`

- [ ] **Step 1: Write the agent file**

Create `agents/theme-analysis-agent.md` with this exact content:

```markdown
# Theme Analysis Agent

## Role

Identify theme- and content-level performance pathologies by fetching the live page
and analyzing its resource graph, DOM structure, and image attributes.

Runs twice per WOW session:
- After baseline audit (iteration 0) → writes `/tmp/.wow/theme-analysis-baseline.json`
- After final iteration audit (loop exit) → writes `/tmp/.wow/iterations/N/theme-analysis-final.json`

## Detection categories

| Category | Signals detected |
|---|---|
| Render-blocking resources | CSS/JS in `<head>` without `async`, `defer`, or `preload`; stylesheets blocking first paint |
| Stylesheet bloat | Total CSS bytes; number of stylesheets; theme-owned vs plugin-owned breakdown |
| Web font loading | `@font-face` without `font-display: swap`; Google Fonts blocking render; multiple font foundries loaded |
| DOM size | Total node count; maximum nesting depth; >1500 nodes = high severity |
| Content image issues | `<img>` without `width`/`height` (CLS source); missing `loading="lazy"` on below-fold images; no `srcset` on large images |

## Steps

### 1. Extract page data

Write a temporary Node.js script to `/tmp/.wow/theme-analysis-extract.js`:

```js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.argv[2], { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    // Head links and scripts
    const headLinks = Array.from(document.querySelectorAll('head link[rel="stylesheet"]'))
      .map(el => ({ tag: 'link', url: el.href, rel: el.rel, media: el.media }));
    const headScripts = Array.from(document.querySelectorAll('head script[src]'))
      .map(el => ({ tag: 'script', url: el.src, async: el.async, defer: el.defer, type: el.type }));

    // DOM size
    const allNodes = document.querySelectorAll('*');
    let maxDepth = 0;
    allNodes.forEach(el => {
      let depth = 0, node = el;
      while (node.parentElement) { depth++; node = node.parentElement; }
      if (depth > maxDepth) maxDepth = depth;
    });

    // Images
    const imgs = Array.from(document.querySelectorAll('img')).map(el => ({
      src: el.src,
      width: el.getAttribute('width'),
      height: el.getAttribute('height'),
      loading: el.getAttribute('loading'),
      srcset: el.getAttribute('srcset'),
      inViewport: el.getBoundingClientRect().top < window.innerHeight
    }));

    // Stylesheets loaded (for @font-face inspection)
    const styleSheetUrls = Array.from(document.styleSheets)
      .filter(s => s.href)
      .map(s => s.href);

    return { headLinks, headScripts, domNodeCount: allNodes.length, maxDepth, imgs, styleSheetUrls };
  });

  await browser.close();
  console.log(JSON.stringify(data));
})();
```

Run:
```bash
node /tmp/.wow/theme-analysis-extract.js <site_url>
```

Delete the temp script after use:
```bash
rm /tmp/.wow/theme-analysis-extract.js
```

If Node.js/Playwright script fails: fall through to Tier 2 below.

**Tier 2 — Claude-in-Chrome fallback:**
- Check: is `mcp__Claude_in_Chrome__navigate` callable?
- If yes: navigate to `<site_url>`, use `mcp__Claude_in_Chrome__javascript_tool` to run equivalent JS and capture the same data structure
- If both Tier 1 and Tier 2 fail: write `{ "status": "skipped", "reason": "no_browser_tool_available" }` to the output path and exit

Note: computer-use and user prompt are intentionally excluded — they cannot return structured DOM data programmatically.

### 2. Read inventory for theme slug

Read the inventory file:
- For baseline run: `/tmp/.wow/baseline.json` (or `/tmp/.wow/iterations/0/inventory.json` if baseline split)
- For final run: `/tmp/.wow/iterations/N/inventory.json`

Extract `active_theme` slug. Use it to classify stylesheet ownership:
- URL contains theme slug → `owner: "theme"`
- Otherwise → `owner: "plugin"` or `"unknown"`

If inventory file is missing: mark all owners as `"unknown"`.

### 3. Fetch theme CSS sizes

For each stylesheet URL with `owner: "theme"`, fetch and measure byte size:
```bash
curl -s --max-time 10 -o /dev/null -w "%{size_download}" "<url>"
```

If fetch fails: record `null` for that stylesheet's size.

### 4. Classify findings by severity

**Render-blocking** (CSS/JS in `<head>` without async/defer/preload):
- Stylesheet without `media` restriction → `severity: "high"`
- Script without `async` or `defer` → `severity: "high"`

**Stylesheet bloat:**
- Theme CSS total > 150 KB → `severity: "high"`
- Theme CSS total > 100 KB → `severity: "medium"`
- Theme CSS total > 50 KB → `severity: "low"`

**Font issues** (inferred from stylesheet URLs and Google Fonts presence):
- `fonts.googleapis.com` in headLinks without preconnect hint → `severity: "high"`
- Multiple font foundries (>1 font provider domain) → `severity: "medium"`
- (font-display swap cannot be checked without CSS parsing — flag Google Fonts as potential issue)

**DOM size:**
- node_count > 1500 → `severity: "high"`
- node_count > 800 → `severity: "medium"`
- node_count <= 800 → `severity: "low"`

**Content images:**
- `<img>` without `width` and `height` → `severity: "medium"` (CLS risk)
- `<img>` without `loading="lazy"` and NOT in viewport → `severity: "medium"`
- `<img>` without `srcset` → `severity: "low"`

### 5. Write output JSON

Write to the appropriate path:
- Baseline: `/tmp/.wow/theme-analysis-baseline.json`
- Final: `/tmp/.wow/iterations/N/theme-analysis-final.json`

```json
{
  "status": "done",
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
    "total_bytes": 0,
    "count": 0,
    "theme_bytes": 0,
    "plugin_bytes": 0
  },
  "font_issues": [
    {
      "issue": "blocking_google_fonts|multiple_foundries",
      "url": "<url>",
      "severity": "high|medium"
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

`summary` counts are totals across all categories combined.

If status is `"skipped"`: write only `{ "status": "skipped", "reason": "<reason>" }`.
```

- [ ] **Step 2: Verify file was created**

```bash
ls agents/theme-analysis-agent.md
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add agents/theme-analysis-agent.md
git commit -m "$(cat <<'EOF'
feat: add theme-analysis-agent for render-blocking/DOM/font/image detection

Runs at baseline and final iteration. Extracts page resource graph via
Node.js+Playwright script, classifies findings by severity, writes
theme-analysis-baseline.json and iterations/N/theme-analysis-final.json.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `agents/visual-regression-agent.md`

**Files:**
- Create: `agents/visual-regression-agent.md`

- [ ] **Step 1: Write the agent file**

Create `agents/visual-regression-agent.md` with this exact content:

```markdown
# Visual Regression Agent

## Role

Compare before/after screenshots for each iteration to detect visual regressions
introduced by WOW's own changes. Non-blocking — the loop continues regardless of outcome.

Runs after every EXECUTE, before VERIFY.
Writes `/tmp/.wow/iterations/N/visual-regression.json`.

## Steps

### 1. Load screenshots

Read `/tmp/.wow/iterations/N/screenshot-before.json` and
`/tmp/.wow/iterations/N/screenshot-after.json`.

Extract `path` from each. If either file is missing, or either has `status: "skipped"`,
or either path does not exist on disk: write skip result and exit.

```json
{ "iteration": N, "status": "skipped", "reason": "screenshot_unavailable" }
```

### 2. Ensure ImageMagick is available

```bash
command -v compare >/dev/null 2>&1
```

If not found, install:
```bash
brew install imagemagick 2>/dev/null || apt-get install -y imagemagick 2>/dev/null || echo "imagemagick_install_failed"
```

Re-check after install attempt. If still not available: set `pixel_diff: "skipped"` and skip to Step 4.

### 3. Run pixel diff

```bash
compare -metric AE -fuzz 5% <before_path> <after_path> \
  /tmp/.wow/iterations/N/diff.png 2>/tmp/.wow/iterations/N/diff-metric.txt
```

Read the metric output (pixel count of changed pixels) from `diff-metric.txt`.
Compute:
```
total_pixels = width * height  (get from: identify -format "%[fx:w*h]" <before_path>)
diff_pct = changed_pixels / total_pixels * 100
```

If `diff_pct <= 5%`: write clean result and exit:
```json
{ "iteration": N, "status": "clean", "diff_pct": N, "pixel_diff": "done", "severity": "none" }
```

### 4. Claude visual judgment (diff_pct > 5% or pixel_diff skipped)

Read both screenshot images visually.

Determine:
- **Expected change**: layout improved — content reflow from image optimization,
  plugin UI removed, debug bar hidden, element repositioned due to performance fix
  → `status: "expected_change"`
- **Regression**: broken layout, missing navigation elements, overlapping content,
  corrupted colors, collapsed header/footer, missing content blocks
  → `status: "regression_flagged"`

### 5. Write output

```json
{
  "iteration": N,
  "status": "clean|expected_change|regression_flagged|skipped",
  "diff_pct": 3.2,
  "diff_image_path": "/tmp/.wow/iterations/N/diff.png",
  "judgment": "<description of what changed and why it is expected or a regression>",
  "severity": "none|low|medium|high",
  "pixel_diff": "done|skipped"
}
```

Severity mapping:
- `none`: status is clean, or expected_change with diff_pct < 10%
- `low`: expected_change with diff_pct >= 10%
- `medium`: regression_flagged with diff_pct > 5% and <= 20%
- `high`: regression_flagged with diff_pct > 20%

`diff_image_path` is only included when `pixel_diff: "done"`.
`diff_pct` is omitted when `pixel_diff: "skipped"`.
```

- [ ] **Step 2: Verify file was created**

```bash
ls agents/visual-regression-agent.md
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add agents/visual-regression-agent.md
git commit -m "$(cat <<'EOF'
feat: add visual-regression-agent for per-iteration before/after diff

Uses ImageMagick pixel diff as fast filter (>5% threshold), then Claude
visual judgment for expected-change vs regression classification.
Non-blocking — loop continues regardless of result.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update `skills/wow/SKILL.md` — add 3 dispatch points

**Files:**
- Modify: `skills/wow/SKILL.md`

- [ ] **Step 1: Read the current file**

Read `skills/wow/SKILL.md` and locate:
1. `### 4. Run AUDIT phase (first baseline)` — ends with "Save to `/tmp/.wow/iterations/N/audit.json` on subsequent runs"
2. `### 5. Loop: PLAN → EXECUTE → VERIFY` — specifically step `**c. EXECUTE**`
3. Step `**d. VERIFY**` — specifically the line "If delta.json contains `"stop": true`, exit the loop and go to step 6."

- [ ] **Step 2: Add dispatch point 1 — after baseline audit**

Find the end of `### 4. Run AUDIT phase (first baseline)`:
```markdown
Save results to `/tmp/.wow/baseline.json` on the first run.
Save to `/tmp/.wow/iterations/N/audit.json` on subsequent runs (N = current_iteration).
```

Replace with:
```markdown
Save results to `/tmp/.wow/baseline.json` on the first run.
Save to `/tmp/.wow/iterations/N/audit.json` on subsequent runs (N = current_iteration).

After the baseline audit completes (first run only): dispatch `theme-analysis-agent`.
Save its output to `/tmp/.wow/theme-analysis-baseline.json`.
If the agent returns `status: "skipped"`, log it and continue — non-blocking.
```

- [ ] **Step 3: Add dispatch point 2 — after EXECUTE, before VERIFY**

Find:
```markdown
**c. EXECUTE**: Invoke `@wow-execute`. Save executed actions to `/tmp/.wow/iterations/N/actions.json`.

**d. VERIFY**:
```

Replace with:
```markdown
**c. EXECUTE**: Invoke `@wow-execute`. Save executed actions to `/tmp/.wow/iterations/N/actions.json`.

**c2. VISUAL REGRESSION**: Dispatch `visual-regression-agent`.
Save its output to `/tmp/.wow/iterations/N/visual-regression.json`.
Non-blocking — proceed to VERIFY regardless of result.

**d. VERIFY**:
```

- [ ] **Step 4: Add dispatch point 3 — on loop exit, after final audit**

Find:
```markdown
If delta.json contains `"stop": true`, exit the loop and go to step 6.
```

Replace with:
```markdown
If delta.json contains `"stop": true`:
  - Dispatch `theme-analysis-agent` for the final analysis.
    Save its output to `/tmp/.wow/iterations/N/theme-analysis-final.json`.
  - Exit the loop and go to step 6.
```

Note: Do NOT add a new `@wow-audit` invocation here. The final re-audit is the existing `@wow-audit`
already invoked inside the VERIFY step as part of the delta.json calculation. The theme-analysis-agent
dispatch follows that existing audit — no additional audit step is needed.

- [ ] **Step 5: Verify the edits**

Read `skills/wow/SKILL.md` and confirm:
- Step 4 now mentions `theme-analysis-agent` after baseline
- Step 5 has `c2. VISUAL REGRESSION` between EXECUTE and VERIFY
- Stop condition now triggers final audit + final theme analysis before going to step 6
- All other steps are unchanged

- [ ] **Step 6: Commit**

```bash
git add skills/wow/SKILL.md
git commit -m "$(cat <<'EOF'
feat: wire theme-analysis-agent and visual-regression-agent into wow orchestrator

Adds 3 dispatch points: theme analysis after baseline audit, visual regression
after each execute, theme analysis again on loop exit (final iteration).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update `agents/plan-agent.md`

**Files:**
- Modify: `agents/plan-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/plan-agent.md`. The current agent has 5 steps. Step 3 assigns actions to three domains: `plugin`, `provider`, `custom`.

- [ ] **Step 2: Add theme-analysis input at the top**

Find the beginning of Step 1:
```markdown
1. Read the provided audit.json. Identify performance gaps ordered by potential impact:
```

Insert before it:
```markdown
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

```

- [ ] **Step 3: Add two new domains to Step 3**

Find:
```markdown
3. Assign each action to exactly one domain:
   - `plugin`: actions that install or configure WordPress plugins
   - `provider`: actions requiring SSH, hosting panel, or server-level changes
   - `custom`: actions requiring direct file edits (htaccess, wp-config, PHP)
```

Replace with:
```markdown
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
```

- [ ] **Step 4: Add regression_suspects to the schema reference**

Find the final step:
```markdown
5. Return the complete plan.json schema (see wow-plan/SKILL.md for schema).
   Rank actions by expected_impact: high → medium → low.
```

Replace with:
```markdown
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
```

- [ ] **Step 5: Verify the file**

Read `agents/plan-agent.md` and confirm:
- Step 0 is added before the original Step 1
- Step 3 now includes `theme` and `content` domains with examples
- Step 5 includes the `regression_suspects` schema addition
- Original Steps 1, 2, 4 are unchanged

- [ ] **Step 6: Commit**

```bash
git add agents/plan-agent.md
git commit -m "$(cat <<'EOF'
feat: add theme/content action domains and regression awareness to plan-agent

Reads theme-analysis-baseline.json and previous iteration visual-regression.json.
Adds theme and content domains to action classification. Populates
regression_suspects in plan.json when prior iteration flagged a regression.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update `agents/report-agent.md`

**Files:**
- Modify: `agents/report-agent.md`

- [ ] **Step 1: Read the current file**

Read `agents/report-agent.md`. The current agent has Steps 1–10. Step 8 builds the markdown summary. Step 9 builds the HTML. Step 10 returns output.

- [ ] **Step 2: Add Step 6b — read theme analysis data**

Find Step 6 (Read remaining gaps):
```markdown
### 6. Read remaining gaps

Read `/tmp/.wow/iterations/N/plan.json`:
```

Insert a new step after Step 6:
```markdown
### 6b. Read theme analysis data

Read `/tmp/.wow/theme-analysis-baseline.json`:
- If missing or `status: "skipped"`: set `theme_analysis = null`
- If `status: "done"`: extract `render_blocking`, `stylesheet_bloat`, `font_issues`, `dom_size`, `content_images`, `summary`

Read `/tmp/.wow/iterations/N/theme-analysis-final.json`:
- If missing: set `theme_analysis_final = null`
- If `status: "done"`: extract same fields as above

### 6c. Read visual regression log

For each iteration 1 through N:
- Read `/tmp/.wow/iterations/<i>/visual-regression.json`
- Collect all entries where `status != "clean"` and `status != "skipped"`
- Store as `regression_log` array

```

- [ ] **Step 3: Add Theme & Content Analysis section to markdown summary (Step 8)**

In Step 8, find the end of the markdown template (the line `Report saved to: /tmp/.wow/report.html`):

Add these sections to the markdown template, just before `Report saved to:`:

```
## Theme & Content Analysis
{{if theme_analysis is null}}
(theme analysis not available)
{{else}}
| Finding               | Baseline | Final  | Status   |
|-----------------------|----------|--------|----------|
| Render-blocking CSS   | <count>  | <count or "—"> | ✓ fixed / — same / not run |
| Stylesheet bloat      | <KB>     | <KB or "—">    | ✓ fixed / — same / not run |
| Font issues           | <count>  | <count or "—"> | ✓ fixed / — same / not run |
| DOM node count        | <count>  | <count or "—"> | ✓ fixed / — same / not run |
| Content image issues  | <count>  | <count or "—"> | ✓ fixed / — same / not run |
{{/if}}

## Visual Regression Log
{{if regression_log is empty}}
No visual regressions detected across <N> iterations.
{{else}}
| Iteration | Status             | Diff % | Judgment |
|-----------|--------------------|--------|----------|
<one row per non-clean, non-skipped entry>
{{/if}}
```

Status column logic for theme analysis:
- `final_count < baseline_count` → "✓ fixed"
- `final_count == baseline_count` → "— same"
- `theme_analysis_final == null` → "not run"

- [ ] **Step 4: Add two new HTML sections to Step 9**

In Step 9 (Build HTML file), find the CSS `<style>` block. Add these styles to the existing styles:

```css
.regression-clean { color: #166534; }
.regression-flagged { color: #991b1b; font-weight: 600; }
.regression-expected { color: #92400e; }
.theme-section table { margin-bottom: 1rem; }
```

After the existing `<h2>Remaining Gaps</h2>` section and before `<h2>Screenshots</h2>`, add:

```html
  <h2>Theme & Content Analysis</h2>
  {{if theme_analysis is not null}}
  <div class="theme-section">
    <table>
      <tr><th>Finding</th><th>Baseline</th><th>Final</th><th>Status</th></tr>
      <!-- render_blocking count row -->
      <!-- stylesheet_bloat total_bytes row (formatted as KB) -->
      <!-- font_issues count row -->
      <!-- dom_size node_count row -->
      <!-- content_images count row -->
    </table>
  </div>
  {{else}}
  <p><em>Theme analysis not available for this run.</em></p>
  {{/if}}

  <h2>Visual Regression Log</h2>
  {{if regression_log is empty}}
  <p class="regression-clean">No visual regressions detected across <N> iterations.</p>
  {{else}}
  <table>
    <tr><th>Iteration</th><th>Status</th><th>Diff %</th><th>Judgment</th></tr>
    {{for each entry in regression_log}}
    <tr>
      <td><entry.iteration></td>
      <td class="regression-flagged|regression-expected"><entry.status></td>
      <td><entry.diff_pct or "—"></td>
      <td><entry.judgment></td>
    </tr>
    {{if entry.status == "regression_flagged" and entry.diff_image_path exists}}
    <tr><td colspan="4">
      <details>
        <summary>View diff image</summary>
        <img src="data:image/png;base64,<base64_encoded_diff_png>" alt="Visual diff iteration <entry.iteration>" style="max-width:100%;border:1px solid #ddd;">
      </details>
    </td></tr>
    {{/if}}
    {{/for}}
  </table>
  {{/if}}
```

For base64 encoding: read the file at `entry.diff_image_path` and encode it:
```bash
base64 -i <diff_image_path>
```
Embed the result as a data URI. If read fails: omit the `<details>` block for that entry.

- [ ] **Step 5: Verify the file**

Read `agents/report-agent.md` and confirm:
- Step 6b and 6c are added after Step 6
- Step 8 markdown template includes Theme & Content Analysis and Visual Regression Log sections
- Step 9 HTML includes new CSS classes and two new HTML sections with base64 diff embedding
- Steps 1–6, 7, 10 are unchanged

- [ ] **Step 6: Commit**

```bash
git add agents/report-agent.md
git commit -m "$(cat <<'EOF'
feat: add Theme Analysis and Visual Regression Log sections to report-agent

Reads theme-analysis-baseline/final.json for before/after comparison table.
Reads per-iteration visual-regression.json for regression log. Embeds diff
images as base64 data URIs in HTML report for regression_flagged entries.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `scripts/install.sh` — add ImageMagick

**Files:**
- Modify: `scripts/install.sh`

- [ ] **Step 1: Read the current file**

Read `scripts/install.sh`. Confirm it ends with the Playwright CLI install section followed by the lighthouse MCP config section. The file currently ends at `echo "⚡ WOW installed..."`.

- [ ] **Step 2: Add ImageMagick install section**

Find the line:
```bash
echo ""
echo "--- Installing Playwright CLI browser (for browser automation) ---"
```

Insert a new section immediately after the Playwright block (after the `&& echo "  ✓ playwright" || echo "  ⚠ playwright install failed (non-fatal)"` line) and before the `echo "" echo "--- Configuring lighthouse MCP..."` section:

```bash
echo ""
echo "--- Installing ImageMagick (for visual regression diff) ---"

command -v compare >/dev/null 2>&1 \
  && echo "  ✓ imagemagick already installed" \
  || (brew install imagemagick 2>/dev/null \
      || apt-get install -y imagemagick 2>/dev/null \
      || echo "  ⚠ imagemagick install failed (non-fatal — visual diff will use Claude vision fallback)")
```

- [ ] **Step 3: Verify the file**

Read `scripts/install.sh` and confirm:
- ImageMagick section appears after Playwright section and before lighthouse MCP config section
- `command -v compare` check is present (idempotent)
- Error message correctly says "non-fatal — visual diff will use Claude vision fallback"
- File still ends with `echo "⚡ WOW installed..."`

- [ ] **Step 4: Commit**

```bash
git add scripts/install.sh
git commit -m "$(cat <<'EOF'
feat: add ImageMagick install step for visual regression pixel diff

Idempotent — skips if already installed. Non-fatal on failure — visual
regression agent falls back to Claude vision comparison.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Run validation

**Files:**
- Read: `scripts/validate-plugin.sh`

- [ ] **Step 1: Check validation script exists**

```bash
ls scripts/validate-plugin.sh
```

If it exists, run:
```bash
bash scripts/validate-plugin.sh
```
Expected: all existing checks pass. Fix any failures before continuing.

- [ ] **Step 2: Verify all new files manually**

```bash
ls agents/theme-analysis-agent.md agents/visual-regression-agent.md
```
Expected: both files exist.

```bash
grep "theme-analysis-agent" skills/wow/SKILL.md
```
Expected: at least one match (Step 4 dispatch point).

```bash
grep "visual-regression-agent" skills/wow/SKILL.md
```
Expected: at least one match (Step 5c2).

```bash
grep "theme\|content" agents/plan-agent.md | grep "domain"
```
Expected: lines showing `theme` and `content` domains.

```bash
grep "Visual Regression" agents/report-agent.md
```
Expected: at least one match.

```bash
grep "ImageMagick" scripts/install.sh
```
Expected: at least one match.

- [ ] **Step 3: Commit only if validation required fixes**

Only commit if fixes were needed.
