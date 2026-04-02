# WOW Core Agent & Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the WOW Claude Code plugin skeleton — all skills, hooks, agent prompts, manifest, and install script that form the autonomous WordPress optimization orchestration layer.

**Architecture:** A Claude Code plugin with six phase skills (wow, wow-intake, wow-audit, wow-plan, wow-execute, wow-verify), seven agent prompt files, three bash hook scripts, and a community resources manifest. The main `wow` skill runs the outer optimization loop; hooks enforce phase order, gate approvals, and control loop termination. All skills are markdown files that guide Claude's behavior — no runtime code beyond the bash hooks.

**Tech Stack:** Claude Code plugin format (markdown skills, bash hook scripts, JSON config), Bash 3.2+, jq for JSON state manipulation, npx/npm for dependency installation.

**Spec:** `docs/superpowers/specs/2026-04-02-wow-core-orchestration-design.md`

---

## File Map

| File | Type | Responsibility |
|---|---|---|
| `plugin.json` | JSON | Plugin metadata, install hooks, skill declarations |
| `wow-manifest.json` | JSON | Curated community skills, MCP servers, WP plugins registry |
| `settings.json` | JSON | Hook configuration wiring bash scripts to Claude events |
| `skills/wow/SKILL.md` | Markdown | Main slash command + orchestrator outer loop |
| `skills/wow-intake/SKILL.md` | Markdown | Conversational intake, credential collection, session init |
| `skills/wow-audit/SKILL.md` | Markdown | Audit phase: dispatches lighthouse, inventory, screenshot agents |
| `skills/wow-plan/SKILL.md` | Markdown | Gap analysis, discovery ladder, ranked action list |
| `skills/wow-execute/SKILL.md` | Markdown | Dispatches plugin, provider, custom agents in parallel |
| `skills/wow-verify/SKILL.md` | Markdown | Re-runs audit, computes delta_pct, decides loop or stop |
| `agents/lighthouse-agent.md` | Markdown | Lighthouse + CWV scores via lighthouse-mcp |
| `agents/inventory-agent.md` | Markdown | Installed plugins, PHP version, server stack fingerprint |
| `agents/screenshot-agent.md` | Markdown | Full-page screenshot capture for REPORT (no diff analysis) |
| `agents/plan-agent.md` | Markdown | Synthesizes audit, assigns actions to domains, builds plan.json |
| `agents/plugin-agent.md` | Markdown | Installs + configures free WP plugins on target site |
| `agents/provider-agent.md` | Markdown | Hosting-level optimizations (LiteSpeed, CDN, PHP-FPM) |
| `agents/custom-agent.md` | Markdown | Bespoke fixes when plugins are insufficient |
| `hooks/phase-enforcer.sh` | Bash | PreToolUse: HARD STOP if write tool fires without plan.json |
| `hooks/loop-controller.sh` | Bash | PostToolUse: computes delta_pct, manages loop/stop state |
| `hooks/progress-reporter.sh` | Bash | PostToolUse: emits status line after each phase |
| `scripts/install.sh` | Bash | Installs community skill and MCP dependencies |
| `scripts/validate-plugin.sh` | Bash | Validates plugin structure and JSON files (test harness) |

---

## Task 1: Validation Script (Test Harness)

Write the validation script first. Every subsequent task uses it to confirm correctness.

**Files:**
- Create: `scripts/validate-plugin.sh`

- [ ] **Step 1: Create scripts directory and write validation script**

```bash
mkdir -p scripts
```

Create `scripts/validate-plugin.sh`:

```bash
#!/usr/bin/env bash
# validate-plugin.sh — verifies WOW plugin structure and JSON validity
set -e
PASS=0; FAIL=0

check() {
  local desc="$1"; local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  ✓ $desc"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc: $result"; FAIL=$((FAIL+1))
  fi
}

file_exists() { [ -f "$1" ] && echo "ok" || echo "missing: $1"; }
dir_exists()  { [ -d "$1" ] && echo "ok" || echo "missing dir: $1"; }
valid_json()  { jq empty "$1" 2>&1 >/dev/null && echo "ok" || echo "invalid JSON: $1"; }
has_section() { grep -q "^## $2" "$1" 2>/dev/null && echo "ok" || echo "missing '## $2' in $1"; }

echo "=== WOW Plugin Validation ==="

echo ""
echo "--- Core files ---"
check "plugin.json exists"         "$(file_exists plugin.json)"
check "plugin.json valid JSON"     "$(valid_json plugin.json)"
check "wow-manifest.json exists"   "$(file_exists wow-manifest.json)"
check "wow-manifest.json valid"    "$(valid_json wow-manifest.json)"
check "settings.json exists"       "$(file_exists settings.json)"
check "settings.json valid JSON"   "$(valid_json settings.json)"

echo ""
echo "--- Skills ---"
for skill in wow wow-intake wow-audit wow-plan wow-execute wow-verify; do
  check "$skill/SKILL.md exists" "$(file_exists skills/$skill/SKILL.md)"
  check "$skill has ## Purpose"  "$(has_section skills/$skill/SKILL.md Purpose)"
  check "$skill has ## Process"  "$(has_section skills/$skill/SKILL.md Process)"
done

echo ""
echo "--- Agents ---"
for agent in lighthouse-agent inventory-agent screenshot-agent plan-agent plugin-agent provider-agent custom-agent; do
  check "$agent.md exists"        "$(file_exists agents/$agent.md)"
  check "$agent has ## Role"      "$(has_section agents/$agent.md Role)"
  check "$agent has ## Steps"     "$(has_section agents/$agent.md Steps)"
done

echo ""
echo "--- Hooks ---"
for hook in phase-enforcer loop-controller progress-reporter; do
  check "$hook.sh exists"         "$(file_exists hooks/$hook.sh)"
  check "$hook.sh executable"     "$([ -x hooks/$hook.sh ] && echo ok || echo 'not executable')"
done

echo ""
echo "--- Scripts ---"
check "install.sh exists"          "$(file_exists scripts/install.sh)"
check "install.sh executable"      "$([ -x scripts/install.sh ] && echo ok || echo 'not executable')"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

- [ ] **Step 2: Make executable and run (expect all failures)**

```bash
chmod +x scripts/validate-plugin.sh
bash scripts/validate-plugin.sh
```

Expected: all `✗` — nothing exists yet. Confirms the tests are wired.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-plugin.sh
git commit -m "test: add plugin structure validation script"
```

---

## Task 2: Plugin Metadata

**Files:**
- Create: `plugin.json`

- [ ] **Step 1: Write plugin.json**

```json
{
  "name": "wow",
  "version": "0.1.0",
  "description": "WOW — WordPress → Optimized WordPress. Autonomous Claude Code plugin for world-class WordPress performance optimization.",
  "author": "Shafqat Ullah",
  "email": "shafqat@sourcevo.com",
  "organization": "Ālo Labs",
  "homepage": "https://alolabs.dev",
  "repository": "https://github.com/alo-labs/wow",
  "license": "MIT",
  "skills": [
    "skills/wow",
    "skills/wow-intake",
    "skills/wow-audit",
    "skills/wow-plan",
    "skills/wow-execute",
    "skills/wow-verify"
  ],
  "install_hook": "scripts/install.sh",
  "dependencies": {
    "required": ["jq"],
    "skills": [
      "wordpress/agent-skills@wp-performance",
      "jeffallan/claude-skills@wordpress-pro",
      "addyosmani/web-quality-skills@core-web-vitals",
      "addyosmani/web-quality-skills@performance",
      "addyosmani/web-quality-skills@best-practices"
    ],
    "mcp_servers": [
      "priyankark/lighthouse-mcp"
    ]
  }
}
```

- [ ] **Step 2: Run validation**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep "plugin.json"
```

Expected: `✓ plugin.json exists`, `✓ plugin.json valid JSON`

- [ ] **Step 3: Commit**

```bash
git add plugin.json
git commit -m "feat: add plugin.json metadata"
```

---

## Task 3: Community Resources Manifest

**Files:**
- Create: `wow-manifest.json`

- [ ] **Step 1: Write wow-manifest.json**

```json
{
  "_note": "All resources must be free/freemium with core features available without payment.",
  "skills": {
    "wordpress-performance": "wordpress/agent-skills@wp-performance",
    "wordpress-pro": "jeffallan/claude-skills@wordpress-pro",
    "core-web-vitals": "addyosmani/web-quality-skills@core-web-vitals",
    "web-performance": "addyosmani/web-quality-skills@performance",
    "best-practices": "addyosmani/web-quality-skills@best-practices"
  },
  "mcp_servers": {
    "lighthouse": "priyankark/lighthouse-mcp",
    "browser": "PENDING — free Playwright/Puppeteer MCP to be evaluated",
    "wp-cli": "PENDING — free WP-CLI MCP to be evaluated"
  },
  "wp_plugins_on_target_site": {
    "free_only": true,
    "_excluded": "ShortPixel and Smush excluded — credit-gated bulk optimization",
    "caching": ["litespeed-cache", "w3-total-cache", "wp-super-cache"],
    "images": ["ewww-image-optimizer"],
    "database": ["wp-optimize"],
    "assets": ["autoptimize", "flying-scripts"],
    "security": ["really-simple-ssl"]
  },
  "discovery": {
    "sources": [
      "https://api.wordpress.org/plugins/info/1.2/?action=query_plugins",
      "https://api.github.com/search/repositories?q=topic:wordpress-optimization",
      "https://registry.npmjs.org/-/v1/search?text=wordpress+mcp"
    ],
    "evaluation_criteria": [
      "free_license",
      "last_updated_within_2_years",
      "no_security_flags",
      "core_features_not_payment_gated"
    ]
  }
}
```

- [ ] **Step 2: Run validation**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep "manifest"
```

Expected: `✓ wow-manifest.json exists`, `✓ wow-manifest.json valid`

- [ ] **Step 3: Commit**

```bash
git add wow-manifest.json
git commit -m "feat: add community resources manifest"
```

---

## Task 4: Main WOW Skill (Orchestrator)

**Files:**
- Create: `skills/wow/SKILL.md`

- [ ] **Step 1: Create directory and write SKILL.md**

```bash
mkdir -p skills/wow
```

Create `skills/wow/SKILL.md`:

```markdown
---
name: wow
description: WOW — WordPress → Optimized WordPress. Autonomous agent that optimizes any WordPress site to world-class performance through iterative auditing, planning, and execution until diminishing returns.
user-invocable: true
---

# WOW — WordPress → Optimized WordPress

**Author**: Shafqat Ullah | **Org**: Ālo Labs | **Repo**: alo-labs/wow

## Purpose

Autonomously optimize any WordPress site to world-class performance. Orchestrates
community skills, MCP tools, and specialist subagents through a phased loop:
INTAKE → AUDIT → PLAN → EXECUTE → VERIFY → repeat until diminishing returns.

When all community resources are exhausted, applies WordPress and performance
domain expertise directly as a last resort to close remaining gaps.

## Process

### 1. Load community skills

Before doing anything, invoke all bundled community skills to load domain knowledge:
- `@wordpress-performance` — WordPress profiling, caching, DB optimization
- `@wordpress-pro` — transient/object caching, query optimization, asset enqueuing
- `@core-web-vitals` — LCP, CLS, INP scoring and thresholds
- `@web-performance` — loading speed, resource optimization
- `@best-practices` — HTTPS, security headers, modern APIs

If any skill fails to load, note it but continue — do not abort.

### 2. Initialize session state

Create `/tmp/.wow/` directory. Initialize `session.json`:

```json
{
  "credentials": "provided_in_session",
  "site_url": "",
  "autonomy_mode": "",
  "threshold": 5,
  "max_iterations": 10,
  "current_iteration": 0,
  "consecutive_below_threshold": 0,
  "focus_areas": "everything",
  "status": "intake"
}
```

Credentials are NEVER written to session.json or any file. Store only in session context.

### 3. Run INTAKE phase

Invoke `@wow-intake`. Wait for it to complete and return populated session values.
Update session.json with all non-credential values from intake.

### 4. Run AUDIT phase (first baseline)

Invoke `@wow-audit`. This dispatches lighthouse-agent, inventory-agent, and
screenshot-agent in parallel. Wait for all to complete.

Save results to `/tmp/.wow/baseline.json` on the first run.
Save to `/tmp/.wow/iterations/N/audit.json` on subsequent runs (N = current_iteration).

### 5. Loop: PLAN → EXECUTE → VERIFY

Repeat until stop condition is met:

**a. PLAN**: Invoke `@wow-plan`. Save output to `/tmp/.wow/iterations/N/plan.json`.

**b. APPROVAL GATE** (supervised mode only):
Read `session.json`. If `autonomy_mode == "supervised"`:
- Present the ranked action list from `plan.json` to the user
- State: "Iteration N plan ready. Review actions above. Type 'proceed' to execute or describe changes."
- Wait for explicit user confirmation before continuing.

**c. EXECUTE**: Invoke `@wow-execute`. Save executed actions to `/tmp/.wow/iterations/N/actions.json`.

**d. VERIFY**: Invoke `@wow-verify`. It computes delta_pct and writes `/tmp/.wow/iterations/N/delta.json`.
Read the delta.json. The loop-controller hook will have already evaluated stop conditions.
If delta.json contains `"stop": true`, exit the loop and go to step 6.
Otherwise increment `current_iteration` in session.json and loop back to PLAN.

### 6. Generate REPORT

Read `baseline.json` and all `iterations/*/delta.json` files.
Read `iterations/*/actions.json` for the complete change log.

Produce a final report covering:
- Before/after Lighthouse Performance, Accessibility, Best Practices, SEO scores
- Before/after Core Web Vitals (LCP, CLS, INP)
- Total iterations run and why the loop stopped
- All changes applied (grouped by domain: plugins, hosting, custom)
- Any remaining gaps with explanation of why they could not be closed
- Before/after screenshot references

### 7. Last-resort intervention

If VERIFY shows improvement is still possible (gaps exist in plan.json) but no
community resource could address them, the orchestrator applies direct intervention:
- Read gap descriptions from the latest `plan.json` `unresolved_gaps` array
- Apply WordPress and web performance expertise directly:
  - Write custom PHP snippets to a must-use plugin (`wp-content/mu-plugins/wow-custom.php`)
  - Generate optimized `.htaccess` rules
  - Modify `wp-config.php` for performance constants
  - Inline critical CSS via theme `functions.php`
- Document all direct interventions in the REPORT under "Custom Interventions"
- Loop back to VERIFY after interventions

## Error Handling

- If a subagent fails, log the failure to `session.json` under `errors[]` and continue
- If credentials are rejected by the target site, stop and ask the user to re-provide them
- If the target site is unreachable, stop and report the connectivity issue
- Never leave the target site in a broken state — if EXECUTE fails mid-run, report
  exactly what was and was not applied so the user can assess
```

- [ ] **Step 2: Run validation**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep "wow/"
```

Expected: `✓ wow/SKILL.md exists`, `✓ wow has ## Purpose`, `✓ wow has ## Process`

- [ ] **Step 3: Commit**

```bash
git add skills/wow/SKILL.md
git commit -m "feat: add main wow orchestrator skill"
```

---

## Task 5: Phase Skills (Intake, Audit, Plan, Execute, Verify)

**Files:**
- Create: `skills/wow-intake/SKILL.md`
- Create: `skills/wow-audit/SKILL.md`
- Create: `skills/wow-plan/SKILL.md`
- Create: `skills/wow-execute/SKILL.md`
- Create: `skills/wow-verify/SKILL.md`

- [ ] **Step 1: Create directories**

```bash
mkdir -p skills/wow-intake skills/wow-audit skills/wow-plan skills/wow-execute skills/wow-verify
```

- [ ] **Step 2: Write wow-intake/SKILL.md**

```markdown
---
name: wow-intake
description: WOW intake phase — conversational collection of site credentials, autonomy mode, threshold, and optimization focus.
---

# WOW Intake

## Purpose

Collect all information needed to start the optimization loop through natural conversation.
Never write credentials to disk. Store only in session context.

## Process

Ask the following questions in order. Wait for each answer before asking the next.

### 1. Site URL
"What is the URL of the WordPress site you'd like to optimize? (e.g., https://example.com)"

Validate: must start with http:// or https://. Re-ask if invalid.

### 2. WordPress credentials
"I'll need WordPress admin access. Please provide either:
  a) Admin username and password
  b) An application password (Settings → Users → Application Passwords)

These will be held only in this session and never saved to disk."

Store credentials in session context only. Do NOT write to any file.

### 3. SSH/hosting access (optional)
"Do you have SSH or hosting panel access? This enables server-level optimizations
(PHP-FPM tuning, server cache headers, LiteSpeed config).

  a) Yes — I have SSH access (provide host, user, key path or password)
  b) Yes — I have hosting panel access (Hostinger, WP Engine, etc.)
  c) No — WordPress admin only

Type a, b, or c."

If a or b: collect connection details. Store in session context only.
If c: note `ssh_available: false` in session.json.

### 4. Autonomy mode
"How would you like me to work?

  a) Hands-off — fully autonomous. I'll optimize and report back when done.
  b) Supervised — I'll pause before each execution phase and show you the plan first.

Type a or b."

Write `autonomy_mode: "autonomous"` or `"supervised"` to session.json.

### 5. Improvement threshold
"I stop optimizing when further iterations improve the Lighthouse score by less than X%.
Default is 5%. Would you like to change it? (Press Enter to accept 5%, or type a number)"

Write `threshold` value to session.json.

### 6. Maximum iterations
"I'll run at most N optimization loops before stopping. Default is 10.
Would you like to change it? (Press Enter to accept 10, or type a number)"

Write `max_iterations` value to session.json.

### 7. Focus areas
"Any specific areas to prioritize? Examples:
  - 'Everything' (default)
  - 'LCP only'
  - 'Fix CLS and remove render-blocking scripts'
  - 'Database and caching only'

(Press Enter for 'everything')"

Write `focus_areas` to session.json.

### Completion
Summarize collected settings (not credentials):
- Site: [url]
- Autonomy: [mode]
- Threshold: [N]%
- Max iterations: [N]
- Focus: [areas]
- SSH available: [yes/no]

State: "Starting optimization. Running baseline audit now."
```

- [ ] **Step 3: Write wow-audit/SKILL.md**

```markdown
---
name: wow-audit
description: WOW audit phase — dispatches lighthouse, inventory, and screenshot agents in parallel to measure current site performance.
---

# WOW Audit

## Purpose

Measure the current state of the WordPress site by running three specialist agents
in parallel. Produces a complete audit snapshot saved to state files.

## Process

### 1. Dispatch parallel agents

Launch all three agents simultaneously using the Agent tool:

- **lighthouse-agent**: Read `agents/lighthouse-agent.md` for the full prompt.
  Pass: site URL from session.json, focus_areas from session.json.
  Output: writes to `/tmp/.wow/iterations/N/lighthouse.json`

- **inventory-agent**: Read `agents/inventory-agent.md` for the full prompt.
  Pass: site URL, WP credentials (from session context), SSH details if available.
  Output: writes to `/tmp/.wow/iterations/N/inventory.json`

- **screenshot-agent**: Read `agents/screenshot-agent.md` for the full prompt.
  Pass: site URL.
  Output: saves screenshot, writes path to `/tmp/.wow/iterations/N/screenshot-before.json`

### 2. Wait for all agents to complete

Do not proceed until all three agents have returned results.

### 3. Merge into audit.json

Read all three output files and merge into a single audit snapshot:

```json
{
  "iteration": N,
  "timestamp": "<ISO 8601>",
  "scores": {
    "performance": 0,
    "accessibility": 0,
    "best_practices": 0,
    "seo": 0
  },
  "core_web_vitals": {
    "lcp_ms": 0,
    "cls": 0,
    "inp_ms": 0,
    "fcp_ms": 0,
    "ttfb_ms": 0
  },
  "inventory": {},
  "screenshot_path": ""
}
```

Write to `/tmp/.wow/iterations/N/audit.json`.

On iteration 0 (baseline), also copy to `/tmp/.wow/baseline.json`.

### 4. Report snapshot

Emit a brief summary:
"Audit complete — Performance: X | LCP: Xms | CLS: X | INP: Xms"
```

- [ ] **Step 4: Write wow-plan/SKILL.md**

```markdown
---
name: wow-plan
description: WOW plan phase — gap analysis, community resource discovery, conflict-free action assignment, and ranked plan generation.
---

# WOW Plan

## Purpose

Analyze the latest audit, identify all performance gaps, map each gap to the best
available community resource, and produce a ranked conflict-free action list.

## Process

### 1. Read inputs

Read:
- `/tmp/.wow/iterations/N/audit.json` — current scores and inventory
- `/tmp/.wow/baseline.json` — original scores for context
- `wow-manifest.json` — known community resources
- `session.json` — focus_areas, current_iteration

### 2. Dispatch plan-agent

Use the Agent tool to launch `plan-agent`. Read `agents/plan-agent.md` for the full prompt.

Pass:
- audit.json content
- manifest content
- focus_areas
- Previous plan (if iteration > 0): `/tmp/.wow/iterations/N-1/plan.json`
- Previous delta (if iteration > 0): `/tmp/.wow/iterations/N-1/delta.json`

Wait for plan-agent to return.

### 3. Save plan

Write plan-agent output to `/tmp/.wow/iterations/N/plan.json`.

The plan.json schema:
```json
{
  "iteration": N,
  "actions": [
    {
      "rank": 1,
      "domain": "plugin|provider|custom",
      "description": "Install and configure LiteSpeed Cache",
      "resource": "litespeed-cache",
      "resource_type": "wp_plugin",
      "expected_impact": "high",
      "conflicts_with": []
    }
  ],
  "unresolved_gaps": [
    {
      "gap": "description of unresolvable issue",
      "reason": "why no resource covers it"
    }
  ]
}
```

### 4. Report plan

Emit summary: "Plan ready — N actions across plugin/provider/custom domains. N unresolved gaps."

If there are unresolved gaps and no community resource exists, note them for potential
orchestrator direct intervention after EXECUTE + VERIFY.
```

- [ ] **Step 5: Write wow-execute/SKILL.md**

```markdown
---
name: wow-execute
description: WOW execute phase — dispatches plugin, provider, and custom agents in parallel to apply the optimization plan.
---

# WOW Execute

## Purpose

Apply the ranked action plan by dispatching specialist agents. Agents run in parallel
within their assigned domains. Conflicts are already resolved at plan time — agents
do not coordinate at runtime.

## Process

### 1. Read plan

Read `/tmp/.wow/iterations/N/plan.json`.

Partition actions by domain:
- `plugin` actions → plugin-agent
- `provider` actions → provider-agent
- `custom` actions → custom-agent

### 2. Dispatch agents in parallel

Launch all three agents simultaneously using the Agent tool.
Only dispatch an agent if it has at least one action assigned.

- **plugin-agent**: Read `agents/plugin-agent.md`. Pass: plugin-domain actions, WP credentials from session context, site URL.
- **provider-agent**: Read `agents/provider-agent.md`. Pass: provider-domain actions, SSH/hosting credentials from session context, site URL, inventory from audit.json.
- **custom-agent**: Read `agents/custom-agent.md`. Pass: custom-domain actions, SSH credentials from session context, site URL.

### 3. Wait for all agents

Do not proceed until all dispatched agents have returned.

### 4. Save executed actions

Merge agent reports into `/tmp/.wow/iterations/N/actions.json`:

```json
{
  "iteration": N,
  "applied": [
    {
      "domain": "plugin",
      "action": "Install LiteSpeed Cache",
      "status": "success|failed|skipped",
      "notes": ""
    }
  ],
  "failed": [],
  "skipped": []
}
```

### 5. Report execution

Emit: "Execution complete — N applied, N failed, N skipped. Running verification."
```

- [ ] **Step 6: Write wow-verify/SKILL.md**

```markdown
---
name: wow-verify
description: WOW verify phase — re-runs audit, computes delta_pct, captures after screenshot, and signals loop/stop to the loop-controller hook.
---

# WOW Verify

## Purpose

Measure post-execution performance, compute improvement delta, and signal whether
the loop should continue or stop. The loop-controller hook reads the output of this
phase to make the final loop/stop decision.

## Process

### 1. Re-run audit

Invoke `@wow-audit` to get current scores. This produces a new `audit.json` for
iteration N in `/tmp/.wow/iterations/N/audit.json`.

### 2. Capture after screenshot

Dispatch `screenshot-agent` to capture current state.
Save path to `/tmp/.wow/iterations/N/screenshot-after.json`.

### 3. Compute delta_pct

Read previous scores:
- If iteration == 1: compare against `baseline.json`
- Otherwise: compare against `iterations/N-1/audit.json`

```
delta_pct = ((current_performance - previous_performance) / previous_performance) * 100
```

Round to 2 decimal places.

### 4. Write delta.json

```json
{
  "iteration": N,
  "previous_performance": 0,
  "current_performance": 0,
  "delta_pct": 0.00,
  "threshold": 5,
  "below_threshold": false,
  "consecutive_below_threshold": 0,
  "stop": false
}
```

`stop` is set by the loop-controller hook (see `hooks/loop-controller.sh`).
Write the file first without `stop`, then the hook updates it.

### 5. Report verification

Emit: "Verify complete — Performance: X (was Y, delta: +Z%). [Continuing/Stopping]."
```

- [ ] **Step 7: Run validation for all phase skills**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep -E "wow-(intake|audit|plan|execute|verify)"
```

Expected: all 10 checks pass (exists + Purpose + Process for each skill).

- [ ] **Step 8: Commit**

```bash
git add skills/
git commit -m "feat: add all six WOW phase skills"
```

---

## Task 6: Agent Prompts

**Files:**
- Create: `agents/lighthouse-agent.md`
- Create: `agents/inventory-agent.md`
- Create: `agents/screenshot-agent.md`
- Create: `agents/plan-agent.md`
- Create: `agents/plugin-agent.md`
- Create: `agents/provider-agent.md`
- Create: `agents/custom-agent.md`

- [ ] **Step 1: Create agents directory**

```bash
mkdir -p agents
```

- [ ] **Step 2: Write agents/lighthouse-agent.md**

```markdown
# Lighthouse Agent

## Role

Run a Lighthouse audit against the target WordPress site and return structured
performance scores and Core Web Vitals metrics.

## Steps

1. Use the `lighthouse` MCP tool to run a full audit against the provided site URL.
   Request categories: performance, accessibility, best-practices, seo.

2. Extract and return the following as JSON:
```json
{
  "scores": {
    "performance": 0,
    "accessibility": 0,
    "best_practices": 0,
    "seo": 0
  },
  "core_web_vitals": {
    "lcp_ms": 0,
    "cls": 0,
    "inp_ms": 0,
    "fcp_ms": 0,
    "ttfb_ms": 0
  },
  "opportunities": [
    { "id": "render-blocking-resources", "savings_ms": 0 }
  ],
  "diagnostics": []
}
```

3. If the MCP tool is unavailable, state: "lighthouse-mcp not available — install with: npm install -g lighthouse-mcp"
   Return scores as null.

4. Write output to `/tmp/.wow/iterations/N/lighthouse.json`.
```

- [ ] **Step 3: Write agents/inventory-agent.md**

```markdown
# Inventory Agent

## Role

Fingerprint the WordPress site environment: installed plugins, active theme,
PHP version, server software, and hosting provider detection.

## Steps

1. Call the WP REST API: `GET /wp-json/wp/v2/plugins` (requires auth).
   If unavailable, use WP-CLI: `wp plugin list --format=json`.

2. Call `GET /wp-json/wp/v2/themes` for active theme info.

3. Detect server stack from HTTP response headers:
   - `X-Powered-By` → PHP version
   - `Server` → web server (nginx, apache, LiteSpeed)
   - `X-LiteSpeed-Cache` → LiteSpeed present
   - `CF-Ray` → Cloudflare CDN
   - Custom headers → hosting provider fingerprint

4. Detect hosting provider:
   - Check headers, known IP ranges, and server software signatures
   - Map to: hostinger | wpengine | kinsta | siteground | bluehost | cloudways | unknown

5. Return as JSON and write to `/tmp/.wow/iterations/N/inventory.json`:
```json
{
  "plugins": [],
  "active_theme": "",
  "php_version": "",
  "web_server": "",
  "hosting_provider": "",
  "cdn_detected": false,
  "litespeed_present": false,
  "object_cache_present": false
}
```
```

- [ ] **Step 4: Write agents/screenshot-agent.md**

```markdown
# Screenshot Agent

## Role

Capture a full-page screenshot of the target WordPress site for inclusion in the
final REPORT. This agent captures screenshots only — no visual diff analysis.

## Steps

1. Use the browser MCP tool (when available) to navigate to the site URL and
   capture a full-page screenshot.

2. Save screenshot to `/tmp/.wow/screenshots/iteration-N-<before|after>.png`.

3. Write the path reference to the output file:
```json
{
  "iteration": N,
  "type": "before|after",
  "path": "/tmp/.wow/screenshots/iteration-N-before.png",
  "timestamp": "<ISO 8601>"
}
```

4. If the browser MCP is unavailable (PENDING status), return:
```json
{ "status": "skipped", "reason": "browser MCP not yet configured" }
```
   Do NOT fail — screenshot capture is non-blocking.
```

- [ ] **Step 5: Write agents/plan-agent.md**

```markdown
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
```

- [ ] **Step 6: Write agents/plugin-agent.md**

```markdown
# Plugin Agent

## Role

Install and configure free WordPress optimization plugins on the target site
as directed by the execution plan.

## Steps

1. For each action in the provided plugin-domain action list:

   a. **Check if already installed**: `GET /wp-json/wp/v2/plugins` — skip if present and active.

   b. **Install**: Use WP-CLI (`wp plugin install <slug> --activate`) or
      WP REST API (`POST /wp-json/wp/v2/plugins` with slug and status: active).

   c. **Configure**: Apply recommended free-tier settings based on plugin type:
      - **Caching plugins**: enable page cache, browser cache, Gzip. Disable if
        LiteSpeed Cache is already active (conflicts).
      - **Image optimization**: enable auto-optimize on upload, set quality to 85.
      - **Asset optimization**: enable CSS/JS minification and concatenation.
        Test that site still loads after enabling — roll back if broken.
      - **Database**: run initial cleanup, schedule weekly optimization.

2. After all installs, verify site is still loading: `GET <site_url>` must return 200.
   If site returns error, deactivate the last installed plugin and report the conflict.

3. Return actions.json fragment with status for each action.

## Constraints

- Only install plugins with `free_only: true` compliance
- Never install plugins requiring API keys or payment for core features
- If WP-CLI and REST API both fail, report as `status: failed` — do not guess
```

- [ ] **Step 7: Write agents/provider-agent.md**

```markdown
# Provider Agent

## Role

Apply hosting-level optimizations using SSH or hosting panel access as directed
by the execution plan. Operates only when SSH or hosting credentials are available.

## Steps

1. If no SSH/hosting credentials in session context, return all actions as
   `status: skipped, reason: no_ssh_access`. Do not fail.

2. For each action in the provider-domain action list:

   **LiteSpeed Cache (if LiteSpeed server detected)**:
   - Enable LiteSpeed Cache plugin (via plugin-agent if not already done)
   - Enable ESI, browser cache, object cache in plugin settings
   - Set cache TTL to 86400 seconds

   **PHP-FPM tuning** (via SSH):
   - Set `opcache.enable=1`, `opcache.memory_consumption=128`
   - Set `opcache.validate_timestamps=0` in production
   - Restart PHP-FPM: `sudo systemctl restart php-fpm`

   **Server cache headers** (via .htaccess or nginx config):
   - Add Cache-Control headers for static assets (1 year for versioned assets)
   - Enable Gzip/Brotli compression at server level

   **CDN detection**:
   - If Cloudflare detected: recommend enabling Auto Minify and Rocket Loader
     (advise user — cannot configure via API without Cloudflare credentials)

3. Return actions.json fragment with status per action.
```

- [ ] **Step 8: Write agents/custom-agent.md**

```markdown
# Custom Agent

## Role

Apply bespoke performance fixes that require direct file editing — when no plugin
or hosting-level tool can address the gap. This is the last automated layer before
orchestrator direct intervention.

## Steps

1. For each action in the custom-domain action list:

   **wp-config.php optimizations** (via SSH or WP file system):
   - Add: `define('WP_CACHE', true);`
   - Add: `define('COMPRESS_CSS', true);`
   - Add: `define('COMPRESS_SCRIPTS', true);`
   - Add: `define('CONCATENATE_SCRIPTS', false);` (safer default)

   **.htaccess rules** (Apache only, detected from inventory):
   - Add browser caching rules for static file types
   - Enable DEFLATE compression
   - Add security headers: X-Content-Type-Options, X-Frame-Options
   - ALWAYS back up existing .htaccess before modifying:
     `cp .htaccess .htaccess.wow-backup-<timestamp>`

   **Must-use plugin for custom PHP** (`wp-content/mu-plugins/wow-custom.php`):
   - Create or append to this file for PHP-level optimizations
   - Examples: disable unused REST API endpoints, remove query strings from assets,
     defer non-critical scripts

2. After each file modification, verify site loads: `GET <site_url>` must return 200.
   If error, restore backup immediately and report `status: failed`.

3. Return actions.json fragment with status per action.

## Safety Rules

- Always create timestamped backups before modifying .htaccess or wp-config.php
- Never modify core WordPress files
- Never modify theme files directly — use mu-plugins instead
- Test after every modification; roll back on any error
```

- [ ] **Step 9: Run validation for agents**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep -E "agent"
```

Expected: all 21 agent checks pass.

- [ ] **Step 10: Commit**

```bash
git add agents/
git commit -m "feat: add all seven agent prompt files"
```

---

## Task 7: Hooks

**Files:**
- Create: `hooks/phase-enforcer.sh`
- Create: `hooks/loop-controller.sh`
- Create: `hooks/progress-reporter.sh`

- [ ] **Step 1: Create hooks directory**

```bash
mkdir -p hooks
```

- [ ] **Step 2: Write hooks/phase-enforcer.sh**

```bash
#!/usr/bin/env bash
# phase-enforcer.sh — PreToolUse hook
# HARD STOP if a write/execution tool fires without plan.json in current iteration state.
#
# Execution tools: wp plugin install/activate, wp eval, ssh (write operations),
# REST API POST/PUT/PATCH/DELETE calls, SFTP writes, file modifications on target site.

SESSION_FILE="/tmp/.wow/session.json"

# Only enforce if a WOW session is active
[ -f "$SESSION_FILE" ] || exit 0

# Read tool name from environment (Claude Code passes CLAUDE_TOOL_NAME)
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# Define execution tool patterns
is_execution_tool() {
  case "$TOOL_NAME" in
    Bash)
      # Block WP-CLI write operations and SSH write commands
      echo "$TOOL_INPUT" | grep -qE \
        "wp plugin (install|activate|deactivate|delete)|wp eval|wp db|ssh.*>|sftp|scp|tee |> .*\.(php|htaccess|conf)" \
        && return 0
      ;;
    mcp__*)
      # Block MCP tools that write to the target site
      echo "$TOOL_NAME" | grep -qE "wp.cli|filesystem" && return 0
      ;;
  esac
  return 1
}

is_execution_tool || exit 0

# Execution tool detected — check for valid plan
ITERATION=$(jq -r '.current_iteration // 0' "$SESSION_FILE" 2>/dev/null)
PLAN_FILE="/tmp/.wow/iterations/${ITERATION}/plan.json"

if [ ! -f "$PLAN_FILE" ]; then
  echo "🚫 WOW PHASE ENFORCER: HARD STOP"
  echo "   Execution tool '$TOOL_NAME' fired without a valid plan for iteration $ITERATION."
  echo "   Expected: $PLAN_FILE"
  echo "   Run @wow-plan before attempting execution."
  exit 2  # Non-zero exit blocks the tool call in Claude Code
fi

exit 0
```

- [ ] **Step 3: Write hooks/loop-controller.sh**

```bash
#!/usr/bin/env bash
# loop-controller.sh — PostToolUse hook
# Fires after wow-verify completes. Computes stop condition and updates delta.json.

SESSION_FILE="/tmp/.wow/session.json"

[ -f "$SESSION_FILE" ] || exit 0

# Only act when current phase is 'verify'
PHASE=$(jq -r '.status // ""' "$SESSION_FILE" 2>/dev/null)
[ "$PHASE" = "verify" ] || exit 0

ITERATION=$(jq -r '.current_iteration // 0' "$SESSION_FILE")
DELTA_FILE="/tmp/.wow/iterations/${ITERATION}/delta.json"

[ -f "$DELTA_FILE" ] || exit 0

DELTA_PCT=$(jq -r '.delta_pct // 0' "$DELTA_FILE")
THRESHOLD=$(jq -r '.threshold // 5' "$SESSION_FILE")
MAX_ITER=$(jq -r '.max_iterations // 10' "$SESSION_FILE")
CONSECUTIVE=$(jq -r '.consecutive_below_threshold // 0' "$SESSION_FILE")

# Check if below threshold
BELOW=$(echo "$DELTA_PCT $THRESHOLD" | awk '{print ($1 < $2) ? "true" : "false"}')

if [ "$BELOW" = "true" ]; then
  CONSECUTIVE=$((CONSECUTIVE + 1))
else
  CONSECUTIVE=0
fi

# Update consecutive count in session
jq ".consecutive_below_threshold = $CONSECUTIVE" "$SESSION_FILE" > /tmp/.wow/session.tmp \
  && mv /tmp/.wow/session.tmp "$SESSION_FILE"

# Determine stop
STOP="false"
STOP_REASON=""

if [ "$CONSECUTIVE" -ge 2 ]; then
  STOP="true"
  STOP_REASON="diminishing_returns"
elif [ "$ITERATION" -ge "$MAX_ITER" ]; then
  STOP="true"
  STOP_REASON="max_iterations_reached"
fi

# Update delta.json with stop signal
jq ".stop = $STOP | .stop_reason = \"$STOP_REASON\" | .consecutive_below_threshold = $CONSECUTIVE" \
  "$DELTA_FILE" > /tmp/.wow/delta.tmp && mv /tmp/.wow/delta.tmp "$DELTA_FILE"

if [ "$STOP" = "true" ]; then
  echo "🏁 WOW: Optimization complete. Reason: $STOP_REASON"
fi

exit 0
```

- [ ] **Step 4: Write hooks/progress-reporter.sh**

```bash
#!/usr/bin/env bash
# progress-reporter.sh — PostToolUse hook
# Emits a concise status line after each WOW phase completes.

SESSION_FILE="/tmp/.wow/session.json"

[ -f "$SESSION_FILE" ] || exit 0

ITERATION=$(jq -r '.current_iteration // 0' "$SESSION_FILE" 2>/dev/null)
PHASE=$(jq -r '.status // "unknown"' "$SESSION_FILE" 2>/dev/null)

# Read latest scores if available
AUDIT_FILE="/tmp/.wow/iterations/${ITERATION}/audit.json"
SCORE=""
if [ -f "$AUDIT_FILE" ]; then
  PERF=$(jq -r '.scores.performance // "?"' "$AUDIT_FILE")
  LCP=$(jq -r '.core_web_vitals.lcp_ms // "?"' "$AUDIT_FILE")
  SCORE=" | Perf: $PERF | LCP: ${LCP}ms"
fi

# Read delta if available
DELTA_FILE="/tmp/.wow/iterations/${ITERATION}/delta.json"
DELTA=""
if [ -f "$DELTA_FILE" ]; then
  DELTA_PCT=$(jq -r '.delta_pct // ""' "$DELTA_FILE")
  [ -n "$DELTA_PCT" ] && DELTA=" | Δ: +${DELTA_PCT}%"
fi

echo "⚡ WOW [iter $ITERATION | $PHASE]$SCORE$DELTA"

exit 0
```

- [ ] **Step 5: Make hooks executable**

```bash
chmod +x hooks/phase-enforcer.sh hooks/loop-controller.sh hooks/progress-reporter.sh
```

- [ ] **Step 6: Run validation for hooks**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep -E "hook|enforcer|controller|reporter"
```

Expected: all 6 hook checks pass (exists + executable for each).

- [ ] **Step 7: Commit**

```bash
git add hooks/
git commit -m "feat: add phase-enforcer, loop-controller, and progress-reporter hooks"
```

---

## Task 8: Settings and Hook Wiring

**Files:**
- Create: `settings.json`

- [ ] **Step 1: Write settings.json**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$(dirname \"$0\")/hooks/phase-enforcer.sh\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$(dirname \"$0\")/hooks/loop-controller.sh\""
          },
          {
            "type": "command",
            "command": "bash \"$(dirname \"$0\")/hooks/progress-reporter.sh\""
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Run validation**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep "settings"
```

Expected: `✓ settings.json exists`, `✓ settings.json valid JSON`

- [ ] **Step 3: Commit**

```bash
git add settings.json
git commit -m "feat: wire hooks via settings.json"
```

---

## Task 9: Install Script

**Files:**
- Create: `scripts/install.sh`

- [ ] **Step 1: Write scripts/install.sh**

```bash
#!/usr/bin/env bash
# install.sh — WOW plugin dependency installer
# Run automatically by Claude Code when /plugin install alo-labs/wow is executed.
set -e

echo "⚡ WOW installer — installing community skill and MCP dependencies..."

# Check for required tools
command -v npx >/dev/null 2>&1 || { echo "❌ npx required. Install Node.js from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required. Install Node.js from https://nodejs.org"; exit 1; }
command -v jq  >/dev/null 2>&1 || { echo "❌ jq required. Install: brew install jq (macOS) / apt install jq (Linux)"; exit 1; }

echo ""
echo "--- Installing community skills ---"

npx skills add wordpress/agent-skills@wp-performance -g -y \
  && echo "  ✓ wp-performance" || echo "  ⚠ wp-performance install failed (non-fatal)"

npx skills add jeffallan/claude-skills@wordpress-pro -g -y \
  && echo "  ✓ wordpress-pro" || echo "  ⚠ wordpress-pro install failed (non-fatal)"

npx skills add addyosmani/web-quality-skills@core-web-vitals -g -y \
  && echo "  ✓ core-web-vitals" || echo "  ⚠ core-web-vitals install failed (non-fatal)"

npx skills add addyosmani/web-quality-skills@performance -g -y \
  && echo "  ✓ web-performance" || echo "  ⚠ web-performance install failed (non-fatal)"

npx skills add addyosmani/web-quality-skills@best-practices -g -y \
  && echo "  ✓ best-practices" || echo "  ⚠ best-practices install failed (non-fatal)"

echo ""
echo "--- Installing MCP servers ---"

npm install -g lighthouse-mcp \
  && echo "  ✓ lighthouse-mcp" || echo "  ⚠ lighthouse-mcp install failed"

echo ""
echo "--- Configuring lighthouse MCP in Claude config ---"

CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
# Linux fallback
[ -f "$CLAUDE_CONFIG" ] || CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG" ]; then
  # Add lighthouse MCP entry if not already present
  if ! jq -e '.mcpServers.lighthouse' "$CLAUDE_CONFIG" >/dev/null 2>&1; then
    jq '.mcpServers.lighthouse = {"command": "npx", "args": ["lighthouse-mcp"]}' \
      "$CLAUDE_CONFIG" > "$CLAUDE_CONFIG.tmp" && mv "$CLAUDE_CONFIG.tmp" "$CLAUDE_CONFIG"
    echo "  ✓ lighthouse added to Claude config"
  else
    echo "  ✓ lighthouse already configured"
  fi
else
  echo "  ⚠ Claude config not found at expected paths. Add lighthouse MCP manually:"
  echo '    "lighthouse": { "command": "npx", "args": ["lighthouse-mcp"] }'
fi

echo ""
echo "⚡ WOW installed. Restart Claude Code / Claude Desktop, then run /wow to start."
echo ""
echo "ℹ Note: browser MCP and WP-CLI MCP are PENDING evaluation. Check https://github.com/alo-labs/wow for updates."
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/install.sh
```

- [ ] **Step 3: Run validation**

```bash
bash scripts/validate-plugin.sh 2>&1 | grep "install"
```

Expected: `✓ install.sh exists`, `✓ install.sh executable`

- [ ] **Step 4: Commit**

```bash
git add scripts/install.sh
git commit -m "feat: add install.sh dependency installer"
```

---

## Task 10: Full Validation and Final Commit

- [ ] **Step 1: Run full validation — expect all green**

```bash
bash scripts/validate-plugin.sh
```

Expected output:
```
=== WOW Plugin Validation ===
--- Core files ---
  ✓ plugin.json exists
  ✓ plugin.json valid JSON
  ✓ wow-manifest.json exists
  ✓ wow-manifest.json valid
  ✓ settings.json exists
  ✓ settings.json valid JSON
--- Skills ---
  ✓ wow/SKILL.md exists ... (18 checks)
--- Agents ---
  ✓ lighthouse-agent.md exists ... (21 checks)
--- Hooks ---
  ✓ phase-enforcer.sh exists
  ✓ phase-enforcer.sh executable ... (6 checks)
--- Scripts ---
  ✓ install.sh exists
  ✓ install.sh executable
=== Results: 52 passed, 0 failed ===
```

If any failures: fix the identified file and re-run before committing.

- [ ] **Step 2: Smoke test hook scripts with mock state**

```bash
# Create mock WOW state
mkdir -p /tmp/.wow/iterations/0
echo '{"current_iteration":0,"status":"verify","threshold":5,"max_iterations":10,"consecutive_below_threshold":0}' \
  > /tmp/.wow/session.json
echo '{"delta_pct":3.2,"threshold":5}' > /tmp/.wow/iterations/0/delta.json

# Test loop-controller
bash hooks/loop-controller.sh
echo "Exit code: $?"
cat /tmp/.wow/iterations/0/delta.json | jq '{stop, consecutive_below_threshold}'
# Expected: {"stop": false, "consecutive_below_threshold": 1}

# Run again to simulate second consecutive below-threshold
bash hooks/loop-controller.sh
cat /tmp/.wow/iterations/0/delta.json | jq '{stop, stop_reason}'
# Expected: {"stop": true, "stop_reason": "diminishing_returns"}

# Test progress-reporter
echo '{"scores":{"performance":72},"core_web_vitals":{"lcp_ms":2100}}' \
  > /tmp/.wow/iterations/0/audit.json
bash hooks/progress-reporter.sh
# Expected: ⚡ WOW [iter 0 | verify] | Perf: 72 | LCP: 2100ms | Δ: +3.2%

# Cleanup
rm -rf /tmp/.wow
```

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: complete WOW core agent & orchestration skeleton

- All 6 phase skills (wow, intake, audit, plan, execute, verify)
- 7 agent prompt files (lighthouse, inventory, screenshot, plan, plugin, provider, custom)
- 3 bash hooks (phase-enforcer, loop-controller, progress-reporter)
- Community resources manifest with free-only WP plugins
- Install script for community skill and MCP dependencies
- Full plugin validation script (52 checks, all passing)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```
