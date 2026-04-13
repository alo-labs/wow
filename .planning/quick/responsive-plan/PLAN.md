# Responsive Design Plan

## Existing Breakpoints Found

### site/index.html (inline `<style>`)

| Breakpoint | Selectors Affected |
|---|---|
| `max-width: 900px` | `.grid-2, .grid-3, .grid-4` -> 1fr; `.feature-grid` -> 2col; `.domain-grid` -> 1fr; `.agent-grid` -> 2col |
| `min-width: 901px and max-width: 1100px` | `.grid-3, .grid-4` -> 2col |
| `min-width: 901px and max-width: 1200px` | `.domain-grid` -> 3col |
| `max-width: 768px` | Nav links hidden + hamburger toggle; hero spacing reduced; `.grid-2` -> 1fr; `.domain-grid` -> 2col; install/enforcement padding reduced |
| `min-width: 769px and max-width: 900px` | `.grid-2` -> 2col; `.domain-grid` -> 3col |
| `max-width: 600px` | CTA group stacked; buttons full-width; `.workflow-table` horizontal scroll; 3rd table column hidden; footer stacked; `.domain-grid` -> 2col; enforcement font shrunk |
| `max-width: 480px` | `.domain-grid` -> 1fr; `.agent-grid` -> 1fr |
| `max-width: 375px` | `.nav-cta` hidden; `.feature-grid` -> 1fr |

### site/help/help.css

| Breakpoint | Selectors Affected |
|---|---|
| `max-width: 900px` | `.doc-layout` -> 1fr (sidebar hidden via `display:none`) |
| `max-width: 700px` | `.quick-links-grid` -> 2col |
| `max-width: 420px` | `.quick-links-grid` -> 1fr |

**Notable:** help.css has only 3 breakpoints total. No breakpoints below 420px. No tablet-specific adjustments between 420-700px.

---

## Gaps Identified

### A. site/index.html -- Main Marketing Page

#### A1. Nav bar at 320-375px
- **Selector:** `nav .nav-inner` (flex row with logo + hamburger + theme toggle + GitHub CTA)
- **Issue:** At 320px, the `nav-cta` is hidden only at <=375px but the remaining elements (logo, hamburger, theme toggle container with `gap:10px`) still crowd. The inline `style="display:flex;align-items:center;gap:10px"` wrapper for theme toggle + CTA has no responsive override.
- **Risk:** Tight horizontal squeeze on 320px devices.

#### A2. Hero section overflow at 320px
- **Selector:** `.hero .version-badge`
- **Issue:** Long text "AI-native Autonomous Agentic Performance Optimizer for WordPress" in a single inline-flex pill. No `text-align:center`, no `flex-wrap`, no `max-width`. At 320px this will overflow or force horizontal scroll.
- **Fix needed:** Add wrapping/centering for the badge text at small widths.

#### A3. Hero h1 with absolute-positioned alpha badge
- **Selector:** `.alpha-badge` (positioned `absolute`, `left:100%`)
- **Issue:** The badge extends beyond the h1 boundary. On narrow screens where h1 wraps to multiple lines, the badge anchors to the end of "WOW!" text but may clip off-screen or overlap.
- **Risk:** Overflow-x on hero section (hero has `overflow:hidden` which masks this, but it clips content).

#### A4. Workflow table at 320px
- **Selector:** `.workflow-table`
- **Issue:** At <=600px, table gets `display:block;overflow-x:auto` and cells use `white-space:nowrap`. This creates a horizontally scrollable table. At 320px the scroll area is extremely narrow, and the `padding:7px 8px` cells with `font-size:.75rem` still produce content wider than viewport. The 3rd column is hidden, but remaining columns still overflow.
- **Risk:** Poor UX -- user must scroll sideways in a tiny viewport.

#### A5. Enforcement code blocks at 320px
- **Selector:** `.enforcement-body`
- **Issue:** `word-break:break-word` is set at 768px but the monospace content includes long unbroken strings (CLI output, file paths). At 320px with `font-size:.73rem` and `padding:12px 14px`, long lines will still overflow.
- **Risk:** Horizontal scroll within code blocks.

#### A6. Domain grid at 320px
- **Selector:** `.domain-grid` -> 1fr at <=480px
- **Issue:** Cards with `.domain-items li` use `font-size:.8rem` with arrow prefix. Fine, but the card padding `clamp(16px,1.75em,28px)` doesn't reduce further. At 320px, usable content width is ~280px which is adequate but tight.
- **Severity:** Low.

#### A7. Credits section wrapping
- **Selector:** `.credits-groups` (flex-wrap with `gap:40px`)
- **Issue:** No responsive reduction of the 40px gap. At 320px, wrapped groups have large gaps eating viewport space.
- **Fix needed:** Reduce gap at small viewports.

#### A8. Footer at 320px
- **Selector:** `footer .footer-inner`
- **Issue:** At <=600px, flex-direction is column. But `.footer-links` with `gap:16px` and `flex-wrap:wrap` may still crowd. Minor issue.
- **Severity:** Low.

### B. site/help/help.css -- Help Center Shared Styles

#### B1. Site nav (`.site-nav`) has NO mobile breakpoint
- **Selector:** `.site-nav` (flex row: logo + nav-links + theme toggle)
- **Issue:** Unlike the main site nav which has a hamburger menu at 768px, the help center nav has NO hamburger, NO responsive rule. At 320px, `.nav-links` (flex row of 3 links) + logo + theme toggle will overflow or wrap awkwardly.
- **This is a critical gap.** The nav will break on every mobile viewport.

#### B2. Breadcrumb overflow
- **Selector:** `.breadcrumb` with `padding: 0.75rem 2rem`
- **Issue:** At 320px, the 2rem (32px) side padding eats 64px, leaving 256px for content. Breadcrumb items with separator characters may wrap. No `flex-wrap:wrap` is set. `display:flex` without wrapping will either overflow or squish items.
- **Fix needed:** Reduce padding, add `flex-wrap:wrap`.

#### B3. Hub hero search bar
- **Selector:** `.hub-search-wrap` (flex row, `max-width:480px`)
- **Issue:** At 320px, the search input + button in a row is fine (flex:1 on input), but the `max-width:480px` with `margin:0 auto` and parent padding `4rem 2rem` means usable width = 320 - 64 = 256px. The search button with text "Search" + icon may compress the input to near-unusable width.
- **Fix needed:** Hide "Search" text on small screens, or stack vertically.

#### B4. Hub cards `minmax(280px, 1fr)`
- **Selector:** `.hub-cards` with `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- **Issue:** At 320px with parent padding (2rem * 2 = 64px), available width = 256px. Since 256 < 280, the grid will produce 1 column but each card will be forced to 280px minimum, causing horizontal overflow.
- **This is a critical gap.** Cards will overflow the viewport on 320px devices.

#### B5. Sidebar hidden at <=900px but no alternative navigation
- **Selector:** `.doc-sidebar { display: none }` at <=900px
- **Issue:** On mobile, the entire sidebar navigation disappears. Users on article pages (getting-started, concepts, etc.) lose all section navigation. There is no mobile alternative (no hamburger, no collapsible TOC).
- **Severity:** Medium-high UX gap (functional, not a layout break).

#### B6. Tables in doc content have no overflow wrapper
- **Selector:** `table` (base styles in help.css, `width:100%`)
- **Issue:** Tables inside `.doc-content` have no `overflow-x:auto` wrapper. At 320px, any table with 3+ columns will overflow the content area.
- **Fix needed:** Add overflow-x:auto to tables or a wrapper class.

#### B7. Pre/code blocks overflow
- **Selector:** `pre` with `overflow-x:auto`
- **Issue:** Already has `overflow-x:auto`. This is handled. No gap here.

#### B8. Quick links grid
- **Selector:** `.quick-links-grid`
- **Issue:** Has breakpoints at 700px (2col) and 420px (1col). Adequate. But parent `.quick-links` has `padding: 2.5rem 2rem` -- the 2rem side padding at 320px leaves 256px. Each `.quick-link-item` has internal padding and an SVG icon. Should fit at 1col but is tight.
- **Severity:** Low.

#### B9. Hub hero padding
- **Selector:** `.hub-hero { padding: 4rem 2rem 3rem }`
- **Issue:** 4rem top padding on 320px screen is 51px+ which is fine, but the 2rem side padding is generous for tiny screens.
- **Severity:** Low (cosmetic).

### C. Help Article Pages (getting-started, concepts, optimization, reference, troubleshooting)

#### C1. All share help.css -- inherit all B-series gaps above

#### C2. Article hero padding
- **Selector:** `.article-hero { padding: 3rem 2rem 2.5rem }`
- **Issue:** Same side-padding concern. At 320px, content area = 256px.
- **Severity:** Low.

#### C3. Doc layout padding
- **Selector:** `.doc-layout { padding: 0 1.5rem }` with `max-width:1100px`
- **Issue:** After sidebar hidden, content fills width. 1.5rem padding at 320px leaves 272px. Content width is acceptable.
- **Severity:** Low.

---

## Implementation Tasks

### Task 1: Add mobile hamburger menu to help center nav
- **File:** `site/help/help.css`
- **What:** Add a `.nav-toggle` button (hamburger) to help pages and corresponding CSS: hide `.nav-links` at <=768px, show hamburger, add `.nav-links.active` dropdown styles mirroring the main site pattern.
- **Why:** B1 -- the help nav has zero mobile handling and will overflow/break on every phone viewport.
- **Note:** Also requires adding the `<button class="nav-toggle">` element to all 6 help HTML files.

### Task 2: Fix hub-cards minmax overflow on 320px
- **File:** `site/help/help.css`
- **What:** Change `.hub-cards` grid to `repeat(auto-fill, minmax(min(280px, 100%), 1fr))` using the `min()` function, so cards shrink below 280px when viewport demands it.
- **Why:** B4 -- cards overflow viewport at 320px.

### Task 3: Add table overflow wrapper for doc content
- **File:** `site/help/help.css`
- **What:** Add `.doc-content table { display:block; overflow-x:auto; -webkit-overflow-scrolling:touch; }` or wrap tables in a `.table-wrap` div.
- **Why:** B6 -- tables in article pages will overflow on mobile.

### Task 4: Fix breadcrumb wrapping and padding
- **File:** `site/help/help.css`
- **What:** Add `@media(max-width:480px) { .breadcrumb { padding: 0.5rem 1rem; flex-wrap: wrap; } }`
- **Why:** B2 -- breadcrumb overflows or squishes at narrow viewports.

### Task 5: Reduce search button text on small screens
- **File:** `site/help/help.css`
- **What:** Add `@media(max-width:400px) { .hub-search-btn span, .hub-search-btn { font-size:0; } .hub-search-btn svg { font-size:1rem; } }` or hide the "Search" text label via a wrapping `<span>`.
- **Why:** B3 -- search button crowds the input at 320px.
- **Note:** May also need a small HTML change to wrap the text "Search" in a `<span class="sr-label">`.

### Task 6: Fix hero version-badge wrapping on main site
- **File:** `site/index.html` (inline styles)
- **What:** Add to the <=375px media query: `.hero .version-badge { text-align:center; white-space:normal; max-width:90%; margin-left:auto; margin-right:auto; }`
- **Why:** A2 -- long badge text overflows at 320px.

### Task 7: Reduce credits gap and help hub padding on small screens
- **File:** `site/index.html` (inline styles) + `site/help/help.css`
- **What:** Add `@media(max-width:480px) { .credits-groups { gap:20px; } }` to index.html. Add `@media(max-width:480px) { .hub-hero { padding: 2.5rem 1rem 2rem; } .quick-links, .hub-cards-section { padding-left:1rem; padding-right:1rem; } .article-hero { padding: 2rem 1rem 1.5rem; } }` to help.css.
- **Why:** A7, B8, B9, C2 -- excessive padding/gaps waste space on small screens.

### Task 8: Add mobile sidebar alternative for help articles
- **File:** `site/help/help.css` + all 5 article HTML files
- **What:** Add a collapsible "On This Page" toggle above `.doc-content` that appears only at <=900px. Use a `<details><summary>On This Page</summary>` wrapping the sidebar nav clone. Style to match existing design tokens.
- **Why:** B5 -- sidebar vanishes on mobile with no replacement, leaving users without section navigation.

---

## Visual QA Steps

After implementation, verify each viewport at these sizes:

### Step 1: Main site (site/index.html)
1. Open at **320x568** -- check: nav hamburger works, hero badge wraps cleanly, version badge doesn't overflow, CTA buttons stack, workflow table scrolls, domain/agent grids are 1-column, credits gap reduced, no horizontal page scroll
2. Open at **375x812** -- check: same as above, nav CTA hidden, feature grid 1-column
3. Open at **390x844** -- check: grids collapse properly, enforcement blocks don't overflow
4. Open at **414x896** -- check: comfortable spacing, no clipping
5. Open at **768x1024** -- check: nav links visible (no hamburger), grids at 2-column layouts, domain grid at 2-column

### Step 2: Help hub (site/help/index.html)
1. Open at **320x568** -- check: nav hamburger appears, hub cards don't overflow (single column, no horizontal scroll), search input usable, quick links 1-column, no horizontal scroll on entire page
2. Open at **375x812** -- check: hub cards single column, search bar comfortable
3. Open at **414x896** -- check: quick links 2-column if >=420px
4. Open at **768x1024** -- check: hub cards 2-column, quick links 4-column at >700px

### Step 3: Help article pages (any of getting-started, concepts, etc.)
1. Open at **320x568** -- check: nav hamburger works, breadcrumb wraps, sidebar hidden, "On This Page" collapsible visible, tables scroll horizontally, code blocks scroll, article content doesn't overflow, padding reduced
2. Open at **375x812** -- check: same as above, comfortable reading width
3. Open at **768x1024** -- check: sidebar appears (>900px? no -- 768 < 900 so sidebar still hidden, collapsible TOC shown)
4. Open at **900px+ width** -- check: sidebar visible, collapsible TOC hidden

### Step 4: Cross-viewport scroll test
- At every viewport above, verify `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (no horizontal overflow) using browser DevTools console.

### Step 5: Dark mode verification
- Toggle dark mode at 320px and 768px for both main site and help pages. Verify no contrast or layout regressions from the responsive changes.
