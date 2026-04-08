// search.js — WOW! Help Center search index

const SEARCH_INDEX = [
  {
    page: 'getting-started',
    title: 'Getting Started',
    url: '../help/getting-started/index.html',
    section: 'Getting Started',
    keywords: ['install', 'wp package install', 'quick start', 'first run', '/wow', 'command', 'requirements', 'php', 'wp-cli'],
    body: 'Install WOW! with wp package install alo-labs/wow. Run /wow to start the autonomous optimization pipeline. Requires WordPress 5.8+, WP-CLI 2.5+, PHP 7.4+.',
    sections: [
      { id: 'requirements',  heading: 'Requirements',   excerpt: 'WordPress 5.8+, WP-CLI 2.5+, PHP 7.4+' },
      { id: 'install',       heading: 'Install',        excerpt: 'wp package install alo-labs/wow' },
      { id: 'first-run',     heading: 'Your First Run', excerpt: 'Run /wow to start the pipeline' },
      { id: 'whats-next',    heading: "What's Next",    excerpt: 'Explore concepts, workflow, and reference' }
    ]
  },
  {
    page: 'concepts',
    title: 'Core Concepts',
    url: '../help/concepts/index.html',
    section: 'Core Concepts',
    keywords: ['agents', 'orchestrator', 'domains', 'pipeline', 'backup', 'rollback', 'performance', 'security', 'seo', 'caching', 'image'],
    body: 'WOW uses 11 specialist agents across 5 domains: Performance, Security, SEO, Caching, Image. The Orchestrator coordinates all agents. Full backup before every run.',
    sections: [
      { id: 'what-is-wow',      heading: 'What is WOW?',              excerpt: 'AI-native autonomous agentic performance optimizer' },
      { id: 'domains',          heading: 'The 5 Optimization Domains', excerpt: 'Performance, Security, SEO, Caching, Image Optimization' },
      { id: 'agents',           heading: 'The 11 Specialist Agents',   excerpt: 'Orchestrator, Audit, Caching, Image, Security, SEO, CSS/JS, Database, CDN, Testing, Backup' },
      { id: 'backup-rollback',  heading: 'Backup & Rollback',         excerpt: 'Full snapshot before any change; automatic rollback on regression' }
    ]
  },
  {
    page: 'optimization',
    title: 'Optimization Workflow',
    url: '../help/optimization/index.html',
    section: 'Optimization',
    keywords: ['workflow', 'audit', 'plan', 'execute', 'verify', 'report', 'core web vitals', 'lcp', 'cls', 'fid', 'inp', 'ttfb', 'visual regression', 'lighthouse'],
    body: 'WOW runs a 6-step pipeline: Audit → Plan → Backup → Execute → Verify → Report. Visual regression detection guards every change.',
    sections: [
      { id: 'overview',      heading: 'Overview',      excerpt: '6-step pipeline triggered by /wow' },
      { id: 'step-audit',    heading: 'Step 1 — Audit',   excerpt: 'Lighthouse scan, Core Web Vitals baseline' },
      { id: 'step-plan',     heading: 'Step 2 — Plan',    excerpt: 'Orchestrator builds prioritized change plan' },
      { id: 'step-backup',   heading: 'Step 3 — Backup',  excerpt: 'Full site backup before any changes' },
      { id: 'step-execute',  heading: 'Step 4 — Execute', excerpt: 'Specialist agents apply changes in dependency order' },
      { id: 'step-verify',   heading: 'Step 5 — Verify',  excerpt: 'Visual regression detection, Lighthouse re-run' },
      { id: 'step-report',   heading: 'Step 6 — Report',  excerpt: 'HTML/JSON report with before/after metrics' }
    ]
  },
  {
    page: 'reference',
    title: 'Reference',
    url: '../help/reference/index.html',
    section: 'Reference',
    keywords: ['agents list', 'commands', 'flags', 'configuration', 'wp-cli', 'dry-run', 'rollback', 'report', 'config', 'wow.config.json'],
    body: 'Full reference for all 11 agents, CLI flags, and configuration options. wow.config.json schema, WP-CLI integration.',
    sections: [
      { id: 'cli-commands',    heading: 'CLI Commands',      excerpt: '/wow, --dry-run, --rollback, --domain, --report' },
      { id: 'agent-reference', heading: 'Agent Reference',   excerpt: 'All 11 agents with domain, changes, and --skip flags' },
      { id: 'configuration',   heading: 'Configuration',     excerpt: 'wow.config.json schema and options' },
      { id: 'wp-cli',          heading: 'WP-CLI Integration', excerpt: 'WP-CLI 2.5+ package manager integration' }
    ]
  },
  {
    page: 'troubleshooting',
    title: 'Troubleshooting',
    url: '../help/troubleshooting/index.html',
    section: 'Troubleshooting',
    keywords: ['error', 'fail', 'rollback', 'broken', 'debug', 'logs', 'revert', 'permission', 'backup failed', 'wp-cli not found', 'timeout'],
    body: 'Common errors and how to resolve them. Use rollback to revert any change WOW made. Logs in wp-content/wow-logs/.',
    sections: [
      { id: 'reading-log',    heading: 'Reading the Log',  excerpt: 'wp-content/wow-logs/ — timestamped JSON per agent' },
      { id: 'common-errors',  heading: 'Common Errors',    excerpt: 'WP-CLI not found, backup failed, visual regression, timeout, permission denied' },
      { id: 'manual-rollback',heading: 'Manual Rollback',  excerpt: '/wow --rollback or restore from wp-content/wow-backups/' },
      { id: 'getting-help',   heading: 'Getting Help',     excerpt: 'GitHub issues with log snippet and /wow --version' }
    ]
  }
];

/**
 * Query the search index.
 * @param {string} q - raw query string
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

/**
 * Render search results into #nav-search-results (article page sidebar).
 * @param {string} q
 * @param {string} baseUrl - relative path prefix to help root, e.g. '../'
 */
function renderNavSearch(q, baseUrl) {
  const container = document.getElementById('nav-search-results');
  if (!container) return;
  container.innerHTML = '';
  if (!q.trim()) return;
  const results = searchHelp(q);
  results.slice(0, 6).forEach(r => {
    const a = document.createElement('a');
    a.className = 'nsr-item';
    a.href = (baseUrl || '') + r.url.replace('../help/', '');
    a.textContent = r.title;
    container.appendChild(a);
  });
}

// Export for module environments; also attach to window
if (typeof module !== 'undefined') module.exports = { SEARCH_INDEX, searchHelp };
if (typeof window !== 'undefined') {
  window.searchHelp = searchHelp;
  window.renderNavSearch = renderNavSearch;
}
