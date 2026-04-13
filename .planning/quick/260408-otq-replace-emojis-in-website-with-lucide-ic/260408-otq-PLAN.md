# Quick Plan: Replace Emojis with Lucide Icons

**File:** `site/index.html`
**Quick ID:** 260408-otq

---

## Emoji Inventory & Lucide Mappings

All emoji occurrences found via HTML numeric entities:

| Entity | Description | Context | Lucide icon-name |
|---|---|---|---|
| `&#128528;` | expressionless face | Feature card: Slow Lighthouse Scores | `gauge` |
| `&#128268;` (×2) | electric plug | Feature card: Plugin Sprawl + domain/agent: Plugin | `plug` |
| `&#128295;` | wrench | Feature card: Server Blindness | `wrench` |
| `&#128247;` (×2) | camera | Feature card: Fear of Breaking + agent: screenshot | `camera` |
| `&#128161;` | light bulb | Callout: root cause | `lightbulb` |
| `&#128257;` | repeat arrows | Callout: self-terminating loop | `repeat` |
| `&#9881;&#65039;` (×2) | gear | Domain/agent: Provider (server & CDN) | `settings` |
| `&#128221;` (×2) | memo | Domain/agent: Custom (file edits) | `file-pen` |
| `&#127912;` (×2) | artist palette | Domain/agent: Theme (CSS & Fonts) | `palette` |
| `&#128444;&#65039;` | desktop/frame | Domain: Content (Images & Markup) | `image` |
| `&#128200;` | chart up | Agent: lighthouse-agent | `trending-up` |
| `&#128270;` | magnifying glass | Agent: inventory-agent | `search` |
| `&#128203;` | clipboard | Agent: plan-agent | `clipboard-list` |
| `&#128230;` | package | Agent: backup-agent | `package` |
| `&#128065;` | eye | Agent: visual-regression | `eye` |
| `&#128202;` | bar chart | Agent: report-agent | `bar-chart-2` |
| `&#127968;` | house/building | Agent: hostinger-agent | `building` |
| `&#9889;` | lightning bolt | Callout: dependencies install automatically | `zap` |
| `&#9728;&#65039;` (HTML) + `'\u2600\uFE0F'`/`'\uD83C\uDF19'` (JS) | sun / moon | Theme toggle button | `sun` / `moon` |

---

## Tasks

### Task 1 — Add Lucide CDN script and icon CSS

**What:** Insert the Lucide CDN `<script>` tag and a CSS rule for `.lucide-icon` sizing/alignment before the closing `</body>` tag (or just before the existing `<script>` block). Also add `lucide.createIcons()` call at the end of the existing `<script>` block.

**Exact changes to `site/index.html`:**

1. Before the `<!-- ────── SCRIPTS ────── -->` comment, add:
   ```html
   <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
   ```

2. In the `<style>` block (anywhere after the reset, before closing `</style>`), add:
   ```css
   /* ── Lucide icon sizing ── */
   [data-lucide] {
     display: inline-block;
     width: 1em;
     height: 1em;
     stroke: currentColor;
     stroke-width: 2;
     stroke-linecap: round;
     stroke-linejoin: round;
     fill: none;
     vertical-align: middle;
   }
   .feature-icon [data-lucide]  { width: 1.6rem; height: 1.6rem; }
   .domain-icon [data-lucide]   { width: 1.8rem; height: 1.8rem; }
   .agent-icon [data-lucide]    { width: 1.6rem; height: 1.6rem; }
   .callout-icon [data-lucide]  { width: 2rem;   height: 2rem;   }
   #theme-icon [data-lucide]    { width: 1.1rem; height: 1.1rem; }
   ```

3. At the end of the existing `<script>` block (just before `</script>`), add:
   ```js
   lucide.createIcons();
   ```

**Verify:** Open `site/index.html` in a browser; Lucide script loads from CDN, no console errors.

**Done:** CDN script present, CSS rules present, `lucide.createIcons()` called after DOM scripts.

---

### Task 2 — Replace all static emoji entities with `<i data-lucide>` elements

**What:** Do a targeted find-and-replace on every emoji numeric entity in the HTML body, substituting `<i data-lucide="icon-name"></i>`. Do NOT touch CSS comment decorators (`─`) or text inside `<code>` elements.

**Replacements (line-by-line, in order of appearance):**

| Line | Find | Replace with |
|---|---|---|
| 569 (theme-icon span content) | `&#9728;&#65039;` | `<i data-lucide="sun"></i>` |
| 608 (feature-icon) | `&#128528;` | `<i data-lucide="gauge"></i>` |
| 613 (feature-icon) | `&#128268;` | `<i data-lucide="plug"></i>` |
| 618 (feature-icon) | `&#128295;` | `<i data-lucide="wrench"></i>` |
| 623 (feature-icon) | `&#128247;` | `<i data-lucide="camera"></i>` |
| 631 (callout-icon) | `&#128161;` | `<i data-lucide="lightbulb"></i>` |
| 669 (callout-icon) | `&#128257;` | `<i data-lucide="repeat"></i>` |
| 687 (domain-icon Plugin) | `&#128268;` | `<i data-lucide="plug"></i>` |
| 699 (domain-icon Provider) | `&#9881;&#65039;` | `<i data-lucide="settings"></i>` |
| 711 (domain-icon Custom) | `&#128221;` | `<i data-lucide="file-pen"></i>` |
| 723 (domain-icon Theme) | `&#127912;` | `<i data-lucide="palette"></i>` |
| 735 (domain-icon Content) | `&#128444;&#65039;` | `<i data-lucide="image"></i>` |
| 761 (agent: lighthouse) | `&#128200;` | `<i data-lucide="trending-up"></i>` |
| 766 (agent: inventory) | `&#128270;` | `<i data-lucide="search"></i>` |
| 771 (agent: screenshot) | `&#128247;` | `<i data-lucide="camera"></i>` |
| 776 (agent: theme-analysis) | `&#127912;` | `<i data-lucide="palette"></i>` |
| 781 (agent: plan) | `&#128203;` | `<i data-lucide="clipboard-list"></i>` |
| 786 (agent: backup) | `&#128230;` | `<i data-lucide="package"></i>` |
| 791 (agent: plugin) | `&#128268;` | `<i data-lucide="plug"></i>` |
| 796 (agent: provider) | `&#9881;&#65039;` | `<i data-lucide="settings"></i>` |
| 801 (agent: custom) | `&#128221;` | `<i data-lucide="file-pen"></i>` |
| 806 (agent: visual-regression) | `&#128065;` | `<i data-lucide="eye"></i>` |
| 811 (agent: report) | `&#128202;` | `<i data-lucide="bar-chart-2"></i>` |
| 816 (agent: hostinger) | `&#127968;` | `<i data-lucide="building"></i>` |
| 964 (callout-icon) | `&#9889;` | `<i data-lucide="zap"></i>` |

**Verify:** `grep -c 'data-lucide' site/index.html` returns 25. `grep -c '&#12' site/index.html` returns 0.

**Done:** All 25 emoji entity occurrences replaced with `<i data-lucide>` elements.

---

### Task 3 — Update JavaScript theme toggle to swap Lucide icons

**What:** The `applyTheme()` function in the inline `<script>` currently sets `theme-icon` textContent to sun/moon Unicode strings. After switching to Lucide, the `<span id="theme-icon">` will contain an `<i data-lucide>` element and must be updated via the DOM, not textContent.

**Current code (line 1049):**
```js
document.getElementById('theme-icon').textContent = dark ? '\u2600\uFE0F' : '\uD83C\uDF19';
```

**Replace with:**
```js
var iconName = dark ? 'sun' : 'moon';
var span = document.getElementById('theme-icon');
span.innerHTML = '<i data-lucide="' + iconName + '"></i>';
lucide.createIcons({ el: span });
```

Note: `lucide.createIcons()` at the bottom of the script initialises the default icon. This per-toggle call re-renders only the span, so there is no flicker on the rest of the page.

**Verify:** Click the theme toggle button in the browser; icon visually changes between sun and moon SVGs with no blank/broken state.

**Done:** Theme toggle renders a Lucide SVG icon that swaps correctly between light and dark mode.

---

## Commit Message

```
feat: replace emoji entities with Lucide SVG icons via CDN

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
