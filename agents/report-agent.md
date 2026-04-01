# Report Agent

## Role

Read all WOW session state files and produce two outputs:
1. A markdown summary string (returned to `wow-report` for terminal emission)
2. A styled HTML file written to `/tmp/.wow/report.html`

## Steps

### 1. Read session context

Read `/tmp/.wow/session.json`:
- Extract: `site_url`, `current_iteration` (total iterations run)

### 2. Read baseline scores

Read `/tmp/.wow/baseline.json`:
- Extract `scores` (performance, accessibility, best_practices, seo)
- Extract `core_web_vitals` (lcp_ms, cls, inp_ms)
- Extract `screenshot_path` as `before_screenshot`

If file is missing: set all before values to `"N/A"` and note "baseline not available".

### 3. Read final iteration scores

Determine N = `current_iteration` from session.json.
Read `/tmp/.wow/iterations/N/audit.json`:
- Extract `scores` and `core_web_vitals` as "after" values
- Extract `screenshot_path` as `after_screenshot`

### 4. Read stop reason

Read `/tmp/.wow/iterations/N/delta.json`:
- Extract `delta_pct`, `consecutive_below_threshold`, `stop` reason
- Stop reason label:
  - If `consecutive_below_threshold >= 2`: "delta below threshold (2 consecutive)"
  - If iterations == max_iterations from session.json: "max iterations reached"
  - Otherwise: "manual stop"

### 5. Collect all applied actions

For each iteration 1 through N:
- Read `/tmp/.wow/iterations/<i>/actions.json` → collect `applied` array
- If `/tmp/.wow/iterations/<i>/hostinger-actions.json` exists → append its `actions` array
- Group all collected actions by `domain`: plugin, provider, custom

### 6. Read remaining gaps

Read `/tmp/.wow/iterations/N/plan.json`:
- Extract `unresolved_gaps` array
- If file missing or array empty: gaps = []

### 7. Compute delta values

For each Lighthouse score (performance, accessibility, best_practices, seo):
```
delta = after - before
delta_pct = ((after - before) / before) * 100  (round to 1 decimal)
prefix = "+" if delta > 0, "" if delta == 0, "" if delta < 0 (negative shows naturally)
```

If before value is "N/A": show delta as "—"

### 8. Build markdown summary

Construct this string (substituting real values):

```
# WOW Report — <site_url>

## Performance Summary
| Metric         | Before | After | Delta    |
|----------------|--------|-------|----------|
| Performance    | <n>    | <n>   | <+n.n%>  |
| Accessibility  | <n>    | <n>   | <+n.n%>  |
| Best Practices | <n>    | <n>   | <+n.n%>  |
| SEO            | <n>    | <n>   | <+n.n%>  |

## Core Web Vitals
| Metric | Before  | After  | Threshold | Status |
|--------|---------|--------|-----------|--------|
| LCP    | <n>s    | <n>s   | < 2.5s    | ✓/✗    |
| CLS    | <n>     | <n>    | < 0.1     | ✓/✗    |
| INP    | <n>ms   | <n>ms  | < 200ms   | ✓/✗    |

## Run Summary
Iterations: <N> | Stop reason: <reason>

## Changes Applied
### Plugins (<count> actions)
<list: - <action> — <status>>

### Hosting (<count> actions)
<list: - <action> — <status>>

### Custom (<count> actions)
<list: - <action> — <status>>

## Remaining Gaps
<list of unresolved_gaps, or "(none — all gaps closed)" if empty>

## Screenshots
Before: <before_screenshot path or "not available">
After:  <after_screenshot path or "not available">

Report saved to: /tmp/.wow/report.html
```

CWV status: ✓ if after value meets threshold, ✗ if not.
LCP: convert lcp_ms to seconds (divide by 1000, round to 1 decimal).
INP: show as ms.

### 9. Build HTML file

Construct an HTML string and write to `/tmp/.wow/report.html`.

Structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WOW Report — <site_url></title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .subtitle { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .positive { color: #166534; background: #dcfce7; }
    .negative { color: #991b1b; background: #fee2e2; }
    .neutral { color: #374151; }
    .pass { color: #166534; }
    .fail { color: #991b1b; }
    details { margin-bottom: 1rem; }
    summary { cursor: pointer; font-weight: 600; padding: 0.5rem 0; }
    .screenshots { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .screenshots img { max-width: 48%; border: 1px solid #ddd; border-radius: 4px; }
    .screenshots .label { font-size: 0.85rem; color: #666; margin-top: 0.25rem; }
    .gap-list { margin: 0; padding-left: 1.5rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <h1>WOW Report</h1>
  <div class="subtitle"><a href="<site_url>"><site_url></a></div>
  <div class="meta">Iterations: <N> &nbsp;|&nbsp; Stop reason: <reason> &nbsp;|&nbsp; <timestamp></div>

  <h2>Performance Summary</h2>
  <table>
    <tr><th>Metric</th><th>Before</th><th>After</th><th>Delta</th></tr>
    <!-- one row per metric; delta cell gets class="positive|negative|neutral" -->
  </table>

  <h2>Core Web Vitals</h2>
  <table>
    <tr><th>Metric</th><th>Before</th><th>After</th><th>Threshold</th><th>Status</th></tr>
    <!-- status cell gets class="pass|fail" -->
  </table>

  <h2>Changes Applied</h2>
  <details open>
    <summary>Plugins (<count>)</summary>
    <ul><!-- action items --></ul>
  </details>
  <details>
    <summary>Hosting (<count>)</summary>
    <ul><!-- action items --></ul>
  </details>
  <details>
    <summary>Custom (<count>)</summary>
    <ul><!-- action items --></ul>
  </details>

  <h2>Remaining Gaps</h2>
  <ul class="gap-list"><!-- gaps or "(none)" --></ul>

  <h2>Screenshots</h2>
  <div class="screenshots">
    <div><img src="<before_path>" alt="Before"><div class="label">Before</div></div>
    <div><img src="<after_path>" alt="After"><div class="label">After</div></div>
  </div>
</body>
</html>
```

Delta cell CSS class rules:
- delta > 0 → `class="positive"`
- delta < 0 → `class="negative"`
- delta == 0 or N/A → `class="neutral"`

If screenshots are unavailable: omit the screenshots section entirely.

### 10. Return output

Return:
```json
{
  "markdown": "<full markdown string>",
  "html_path": "/tmp/.wow/report.html",
  "status": "done"
}
```

If HTML write fails: set `html_path: null`, `status: "done_no_html"`, include `error` field.
