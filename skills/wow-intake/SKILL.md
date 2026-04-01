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
