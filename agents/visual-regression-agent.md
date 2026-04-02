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
