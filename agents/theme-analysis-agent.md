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

**Font issues:**
- `fonts.googleapis.com` in headLinks without preconnect hint → `severity: "high"`, issue: `blocking_google_fonts`
- Multiple font foundries (>1 font provider domain) → `severity: "medium"`, issue: `multiple_foundries`
- For each theme-owned stylesheet fetched in Step 3: search the CSS text for `font-display` keyword.
  If `font-display: swap` is absent from any `@font-face` block (or `font-display` does not appear at all): → `severity: "medium"`, issue: `missing_font_display_swap`
  (Use the CSS text already fetched in Step 3 — no extra request needed. If CSS text was not fetched or fetch failed: skip this check for that stylesheet.)

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
      "issue": "missing_font_display_swap|blocking_google_fonts|multiple_foundries",
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
