# Quick Plan: Add Comprehensive Help Center to WOW! Website

**Quick ID:** 260408-pdk  
**Working directory:** `site/help/`  
**Touches:** `site/help/**`, `site/index.html` (nav link only)

---

## Overview

Build a full static Help Center under `site/help/` for the WOW! product.
No build tooling — plain HTML/CSS/JS, consistent with `site/index.html`.

Design tokens (from `site/index.html`):

```css
/* Light */
--accent: #059669;
--accent-light: #10b981;

/* Dark (data-theme="dark") */
--accent: #34d399;
--accent-light: #6ee7b7;
```

All pages share:
- Same font stack and CSS custom properties as the main site
- Lucide icons via CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`
- Dark/light toggle (same JS pattern as main site)
- A shared `<nav>` that mirrors the main site nav (with a "Help" link active)
- A shared `<footer>` reading "WOW! Help Center" with links to Home / GitHub / License

---

## Shared Component Spec (used in every task below)

### Nav HTML pattern
```html
<nav class="site-nav">
  <a class="nav-logo" href="/site/index.html">WOW!</a>
  <ul class="nav-links">
    <li><a href="/site/index.html">Home</a></li>
    <li><a href="https://github.com/alo-labs/wow">GitHub</a></li>
    <li><a href="/site/help/index.html" class="nav-active">Help</a></li>
  </ul>
  <button id="theme-toggle" aria-label="Toggle theme">
    <i data-lucide="sun"></i>
  </button>
</nav>
```

### Footer HTML pattern
```html
<footer class="help-footer">
  <p>WOW! Help Center</p>
  <nav>
    <a href="/site/index.html">Home</a>
    <a href="https://github.com/alo-labs/wow">GitHub</a>
    <a href="https://github.com/alo-labs/wow/blob/main/LICENSE">License</a>
  </nav>
  <p class="footer-copy">© Ālo Labs. Built with WOW!</p>
</footer>
```

### Dark/light toggle JS snippet (inline at bottom of each page)
```js
(function() {
  const root = document.documentElement;
  const saved = localStorage.getItem('wow-theme');
  if (saved) root.setAttribute('data-theme', saved);
  document.getElementById('theme-toggle')?.addEventListener('click', function() {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('wow-theme', next);
    lucide.createIcons();
  });
  lucide.createIcons();
})();
```

### Shared CSS file: `site/help/help.css`
Contains:
- CSS custom properties mirroring `site/index.html` `:root` / `[data-theme="dark"]`
- `.site-nav`, `.nav-logo`, `.nav-links`, `.nav-active` styles
- `.help-footer` styles
- `.breadcrumb` — flex row, separator `›`, small muted text
- `.doc-layout` — CSS Grid: `250px 1fr` on `min-width: 900px`, single column below
- `.doc-sidebar` — sticky `top: 1.5rem`, `max-height: calc(100vh - 3rem)`, overflow-y auto
- `.sidebar-nav a` — block links, padding, border-left highlight on `.active`
- `.doc-content` — `max-width: 720px`
- `.hero-article` — padded hero band with accent-left border
- `.hub-search` — centered search bar, `max-width: 480px`, border-radius pill
- `.quick-links-grid` — CSS Grid `repeat(4, 1fr)`, responsive → 2-col → 1-col
- `.hub-cards` — Grid `repeat(auto-fill, minmax(280px, 1fr))`
- `.hub-card` — card with border, hover lift, badge chip in top-right corner
- `.badge-green`, `.badge-grey`, `.badge-amber`, `.badge-red` — small pill badges
- `.section-alt` — background `var(--surface-alt, #f0fdf4)` / dark variant
- `.bottom-callout` — full-width accent band, centered CTA
- `.nav-search` — small inline search input in article page nav

---

## Tasks

### Task 1 — Create `site/help/help.css` (shared stylesheet)

**File:** `site/help/help.css`

Implement every CSS rule described in the Shared Component Spec above.
Full token set must be declared:

```css
:root {
  --accent: #059669;
  --accent-light: #10b981;
  --bg: #ffffff;
  --surface: #f9fafb;
  --surface-alt: #f0fdf4;
  --text: #111827;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --radius: 0.5rem;
  --font: 'Inter', system-ui, sans-serif;
}
[data-theme="dark"] {
  --accent: #34d399;
  --accent-light: #6ee7b7;
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-alt: #134e4a;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
}
```

Key layout rules to include:
- `body` → `font-family: var(--font); background: var(--bg); color: var(--text); margin: 0;`
- `.site-nav` → `display: flex; align-items: center; gap: 1.5rem; padding: 1rem 2rem; border-bottom: 1px solid var(--border); background: var(--bg);`
- `.doc-layout` → `display: grid; grid-template-columns: 250px 1fr; gap: 2rem; max-width: 1100px; margin: 2rem auto; padding: 0 1.5rem;`
- `@media (max-width: 900px)` → `.doc-layout { grid-template-columns: 1fr; }`
- `.sidebar-nav a.active` → `border-left: 3px solid var(--accent); color: var(--accent); padding-left: calc(0.75rem - 3px);`
- `.hub-card:hover` → `transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.12);`
- `.bottom-callout` → `background: var(--accent); color: #fff; text-align: center; padding: 3rem 2rem;`
- `nth-child(even).section-alt` is applied via class in HTML, not pseudo-selector in CSS

Commit message: `feat(help): add shared help.css stylesheet`

---

### Task 2 — Create `site/help/search.js` (full-text search index)

**File:** `site/help/search.js`

Implement a client-side search index and query function:

```js
// search.js — WOW! Help Center search index
const SEARCH_INDEX = [
  {
    title: 'Getting Started',
    url: '/site/help/getting-started/index.html',
    section: 'Getting Started',
    keywords: ['install', 'wp package install', 'quick start', 'first run', '/wow', 'command'],
    body: 'Install WOW! with wp package install alo-labs/wow. Run /wow to start the autonomous optimization pipeline.'
  },
  {
    title: 'Core Concepts',
    url: '/site/help/concepts/index.html',
    section: 'Core Concepts',
    keywords: ['agents', 'orchestrator', 'domains', 'pipeline', 'backup', 'rollback'],
    body: 'WOW uses 11 specialist agents across 5 domains: Performance, Security, SEO, Caching, Image. The Orchestrator coordinates all agents.'
  },
  {
    title: 'Optimization Workflow',
    url: '/site/help/optimization/index.html',
    section: 'Optimization',
    keywords: ['workflow', 'audit', 'plan', 'execute', 'verify', 'report', 'core web vitals', 'lcp', 'cls', 'fid'],
    body: 'WOW runs a 6-step pipeline: Audit → Plan → Backup → Execute → Verify → Report. Visual regression detection guards every change.'
  },
  {
    title: 'Reference',
    url: '/site/help/reference/index.html',
    section: 'Reference',
    keywords: ['agents list', 'commands', 'flags', 'configuration', 'wp-cli'],
    body: 'Full reference for all 11 agents, CLI flags, and configuration options.'
  },
  {
    title: 'Troubleshooting',
    url: '/site/help/troubleshooting/index.html',
    section: 'Troubleshooting',
    keywords: ['error', 'fail', 'rollback', 'broken', 'debug', 'logs', 'revert'],
    body: 'Common errors and how to resolve them. Use rollback to revert any change WOW made.'
  }
];

/**
 * Query the search index.
 * @param {string} q — raw query string
 * @returns {Array} matching index entries (score-sorted)
 */
function searchHelp(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return SEARCH_INDEX
    .map(entry => {
      const haystack = [entry.title, entry.section, ...entry.keywords, entry.body]
        .join(' ').toLowerCase();
      const score = terms.reduce((s, t) => s + (haystack.split(t).length - 1), 0);
      return { ...entry, score };
    })
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Export for module environments; also attach to window
if (typeof module !== 'undefined') module.exports = { SEARCH_INDEX, searchHelp };
if (typeof window !== 'undefined') window.searchHelp = searchHelp;
```

Commit message: `feat(help): add search.js full-text index`

---

### Task 3 — Create `site/help/index.html` (Hub page)

**File:** `site/help/index.html`

This is the Help Center landing page. Structure:

1. `<head>` — charset, viewport, title "WOW! Help Center", link `help.css`, Google Fonts Inter
2. Nav (shared pattern, `nav-active` on Help link)
3. **Hub hero** — centered, `<h1>WOW! Help Center</h1>`, subtitle, centered search bar (`<input class="hub-search">` + search button with Lucide `search` icon). Search bar wires to `searchHelp()` from `search.js` and renders results below the bar in a `#search-results` div.
4. **Quick links strip** — `<section class="quick-links">`, `<div class="quick-links-grid">` with exactly 8 links:
   - Install WOW → getting-started
   - Run /wow → getting-started
   - How agents work → concepts
   - Optimization pipeline → optimization
   - CLI reference → reference
   - Rollback a change → troubleshooting
   - Visual regression → concepts
   - All 11 agents → reference
5. **Hub cards section** — `<section class="hub-cards-section">`, `<div class="hub-cards">` — 5 cards in this order:
   - Getting Started — badge-green — icon `rocket` — "Install and run your first optimization in under 2 minutes."
   - Core Concepts — badge-grey — icon `layers` — "Understand the 11 agents and 5 optimization domains."
   - Optimization Workflow — badge-grey — icon `workflow` — "How WOW audits, plans, executes, and verifies every change."  
     (Note: Lucide `workflow` may not exist; use `git-branch` as fallback)
   - Reference — badge-amber — icon `book-open` — "CLI flags, agent configuration, and WP-CLI commands."
   - Troubleshooting — badge-red — icon `life-buoy` — "Diagnose errors, read logs, and roll back safely."
   Each card is `<a href="…/index.html" class="hub-card">`. Badge chip is `<span class="badge badge-green">New</span>` etc. (only Getting Started gets "New"; others get section name as label).
6. **Section alternation** — add `class="section-alt"` to even-numbered `<section>` elements manually.
7. **Bottom callout** — `<section class="bottom-callout">`, headline "Ready to optimize?", subtext "One command. Eleven agents. Zero guesswork.", CTA button linking to getting-started.
8. Footer (shared pattern)
9. Scripts: `search.js`, Lucide CDN, dark/light toggle inline script

Commit message: `feat(help): add help center hub page`

---

### Task 4 — Create `site/help/getting-started/index.html`

**File:** `site/help/getting-started/index.html`

Article page structure:
1. Head — title "Getting Started — WOW! Help Center", link `../help.css`
2. Nav (shared, Help active)
3. **Breadcrumb** — `Help › Getting Started`
4. **Hero article band** — `<div class="hero-article">`, `<h1>Getting Started</h1>`, lead paragraph: "Install WOW! and run your first autonomous optimization in under 2 minutes."
5. **doc-layout** — `<div class="doc-layout">`:
   - **Left sidebar** `<aside class="doc-sidebar">`:
     - Small nav search input `<input class="nav-search" placeholder="Search…">` wired to `searchHelp()` (shows dropdown results)
     - `<nav class="sidebar-nav">` with anchor links to each H2 in the content:
       `#requirements`, `#install`, `#first-run`, `#whats-next`
     - IntersectionObserver JS (inline at bottom) sets `.active` on the sidebar link whose section is in view
   - **Content** `<main class="doc-content">`:
     - `## Requirements` (id="requirements") — WordPress 5.8+, WP-CLI 2.5+, PHP 7.4+
     - `## Install` (id="install") — `wp package install alo-labs/wow`, note about GitHub source
     - `## Your First Run` (id="first-run") — Run `/wow`, explain what happens: audit → backup → optimize → report. Code block showing the command.
     - `## What's Next` (id="whats-next") — Links to Concepts, Optimization Workflow, Reference
6. Footer (shared)
7. Scripts: `../search.js`, Lucide CDN, dark/light toggle JS, IntersectionObserver snippet

**IntersectionObserver snippet** (inline before `</body>`):
```js
(function() {
  const headings = document.querySelectorAll('.doc-content h2[id]');
  const links = document.querySelectorAll('.sidebar-nav a');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.sidebar-nav a[href="#${e.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  headings.forEach(h => observer.observe(h));
})();
```

Commit message: `feat(help): add getting-started article page`

---

### Task 5 — Create `site/help/concepts/index.html`

**File:** `site/help/concepts/index.html`

Same article page structure as Task 4. Content sections:

- `## What is WOW?` (id="what-is-wow") — AI-native autonomous agentic performance optimizer. One command: `/wow`.
- `## The 5 Optimization Domains` (id="domains") — Performance (Core Web Vitals), Security (SSL/hardening), SEO, Caching, Image Optimization. Brief description of each.
- `## The 11 Specialist Agents` (id="agents") — Table or definition list:
  - Orchestrator — coordinates the full pipeline
  - Audit — baseline metrics via Lighthouse
  - Caching — server/browser/CDN cache rules
  - Image — compression and lazy-load
  - Security — SSL, headers, hardening
  - SEO — meta, schema, sitemap
  - CSS/JS — minification, defer, tree-shake
  - Database — query optimization, cleanup
  - CDN — provider integration
  - Testing — visual regression
  - Backup — full snapshot before any change
- `## Backup & Rollback` (id="backup-rollback") — Every run takes a full backup first. Rollback is automatic if visual regression is detected; manual rollback is also available.
- `## What's Next` (id="whats-next") — Links to Optimization Workflow, Reference

Sidebar nav links to all 4 H2 ids. Breadcrumb: `Help › Core Concepts`.

Commit message: `feat(help): add core concepts article page`

---

### Task 6 — Create `site/help/optimization/index.html`

**File:** `site/help/optimization/index.html`

This is the primary workflow page. Same article structure. Content sections:

- `## Overview` (id="overview") — WOW runs a 6-step pipeline automatically when you run `/wow`.
- `## Step 1 — Audit` (id="step-audit") — Lighthouse scan, Core Web Vitals baseline, inventory of plugins/theme/server config. Metrics captured: LCP, CLS, FID/INP, TTFB.
- `## Step 2 — Plan` (id="step-plan") — Orchestrator scores findings, builds prioritized change plan. No changes made yet.
- `## Step 3 — Backup` (id="step-backup") — Full site backup (database + files). Backup stored locally and optionally offloaded. This is the rollback point.
- `## Step 4 — Execute` (id="step-execute") — Specialist agents apply changes in dependency order (e.g., CSS/JS before caching, images before CDN). Each change is isolated and logged.
- `## Step 5 — Verify` (id="step-verify") — Visual regression detection screenshots before/after. If regression detected, automatic rollback triggers. Lighthouse re-run confirms improvements.
- `## Step 6 — Report` (id="step-report") — HTML/JSON report generated. Before/after metric comparison. List of all changes made.
- `## What's Next` (id="whats-next") — Links to Reference, Troubleshooting

Sidebar nav links to all 7 H2 ids. Breadcrumb: `Help › Optimization Workflow`.

Commit message: `feat(help): add optimization workflow article page`

---

### Task 7 — Create `site/help/reference/index.html`

**File:** `site/help/reference/index.html`

Same article structure. Content sections:

- `## CLI Commands` (id="cli-commands") — 
  ```
  wp package install alo-labs/wow   # Install
  /wow                               # Run full optimization
  /wow --dry-run                     # Audit only, no changes
  /wow --domain=example.com          # Target specific domain
  /wow --rollback                    # Revert last run
  /wow --report                      # Show last report
  ```
- `## Agent Reference` (id="agent-reference") — Table: Agent name | Domain | What it changes | Key flags. Cover all 11 agents. Flags: `--skip-<agent>` to skip any agent, e.g. `--skip-image`.
- `## Configuration` (id="configuration") — `wow.config.json` schema:
  ```json
  {
    "domains": ["example.com"],
    "agents": { "image": { "quality": 85, "formats": ["webp"] } },
    "backup": { "offload": false },
    "report": { "format": "html" }
  }
  ```
- `## WP-CLI Integration` (id="wp-cli") — WOW uses WP-CLI package manager. Requires WP-CLI 2.5+. Compatible with any WP-CLI setup.
- `## What's Next` (id="whats-next") — Links to Troubleshooting

Sidebar nav links to all 4 content H2 ids (not whats-next). Breadcrumb: `Help › Reference`.

Commit message: `feat(help): add reference article page`

---

### Task 8 — Create `site/help/troubleshooting/index.html`

**File:** `site/help/troubleshooting/index.html`

Same article structure. Content sections:

- `## Reading the Log` (id="reading-log") — WOW outputs a structured log during each run. Location: `wp-content/wow-logs/`. Format: timestamped JSON entries per agent.
- `## Common Errors` (id="common-errors") — Table or definition list:
  - `WP-CLI not found` — Install WP-CLI ≥ 2.5
  - `Backup failed` — Check disk space, file permissions on `wp-content/`
  - `Visual regression detected` — Automatic rollback ran; check screenshots in report
  - `Agent timeout` — Network/server too slow; run with `--skip-<agent>` to isolate
  - `Permission denied` — Ensure WP-CLI runs as the webserver user or with correct sudo
- `## Manual Rollback` (id="manual-rollback") — Run `/wow --rollback`. Lists available restore points. Confirm to restore. Alternatively, restore manually from backup archive in `wp-content/wow-backups/`.
- `## Getting Help` (id="getting-help") — GitHub issues: https://github.com/alo-labs/wow/issues. Include the log snippet and WOW version (`/wow --version`).

Sidebar nav links to all 4 H2 ids. Breadcrumb: `Help › Troubleshooting`.

Commit message: `feat(help): add troubleshooting article page`

---

### Task 9 — Add "Help" link to main site nav in `site/index.html`

**File:** `site/index.html`

Locate the existing `<nav>` element (or the nav links list) in `site/index.html` and add a "Help" anchor that links to `/site/help/index.html`.

Steps:
1. Read `site/index.html` to locate the nav HTML (search for `<nav` or existing nav link pattern).
2. Insert `<li><a href="/site/help/index.html">Help</a></li>` (or the equivalent anchor element matching the existing nav item pattern) into the nav links list, after the existing last nav item.
3. Do NOT change any other content, styles, or scripts.

Commit message: `feat(help): add Help link to main site nav`

---

## Execution Order

Tasks 1–8 are independent and can be written in any order, but Task 9 depends on all prior tasks being complete (to avoid a broken Help link pointing to non-existent pages).

Recommended sequence:
1. Task 1 (help.css) — all article pages depend on it
2. Task 2 (search.js) — hub and article pages depend on it
3. Tasks 3–8 in order (hub, then articles)
4. Task 9 last (main nav update)

---

## Verification Checklist

After all tasks complete:

- [ ] `site/help/help.css` exists, contains `:root` tokens and all layout classes
- [ ] `site/help/search.js` exists, `searchHelp('install')` returns Getting Started result
- [ ] `site/help/index.html` — opens in browser, dark/light toggle works, search bar functional, 5 hub cards visible, quick-links grid shows 4 columns on desktop
- [ ] `site/help/getting-started/index.html` — breadcrumb shows, sidebar sticky, IntersectionObserver highlights active section on scroll
- [ ] `site/help/concepts/index.html` — 11 agents listed, domains listed
- [ ] `site/help/optimization/index.html` — 6-step pipeline documented
- [ ] `site/help/reference/index.html` — CLI commands in code block, agent table present
- [ ] `site/help/troubleshooting/index.html` — common errors table, rollback instructions
- [ ] `site/index.html` — "Help" link present in nav, links to `site/help/index.html`
- [ ] All pages: Lucide icons render, dark mode applies correct green tokens, no broken links between pages
