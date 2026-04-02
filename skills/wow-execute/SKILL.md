---
name: wow-execute
description: WOW execute phase — dispatches plugin, provider, custom, theme, and content agents in parallel to apply the optimization plan.
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
- `theme` actions → custom-agent (theme actions are mu-plugin overrides — same execution path as custom)
- `content` actions → custom-agent (content actions are WordPress filters in mu-plugin — same execution path as custom)

### 2. Dispatch agents in parallel

Launch agents simultaneously (up to three: plugin-agent, provider-agent or hostinger-agent, custom-agent).
Only dispatch an agent if it has at least one action assigned.

- **plugin-agent**: Read `agents/plugin-agent.md`. Pass: plugin-domain actions, WP credentials from session context, site URL.
- **provider-agent**:
  - Read `iterations/N/inventory.json` → check `hosting_provider`
  - If `hosting_provider == "hostinger"`:
    → Read `agents/providers/hostinger-agent.md`
  - Else:
    → Read `agents/provider-agent.md`
  - Pass: provider-domain actions, SSH/hosting credentials from session context,
    site URL, full inventory from audit.json.
- **custom-agent**: Read `agents/custom-agent.md`. Pass: custom-domain actions + theme-domain actions + content-domain actions (combined), SSH credentials from session context, site URL.

### 3. Wait for all agents

Do not proceed until all dispatched agents have returned.

### 3b. Handle Hostinger fallback

If the Hostinger agent was dispatched and returned `status: "fallback_to_provider"`:
- Re-dispatch using `agents/provider-agent.md` with the same provider-domain actions.
- Wait for the generic provider-agent to complete before proceeding to Step 4.

### 4. Save executed actions

Merge agent reports into `/tmp/.wow/iterations/N/actions.json`:

If Hostinger agent was dispatched, also merge `/tmp/.wow/iterations/N/hostinger-actions.json` into the `applied` array.

```json
{
  "iteration": "N",
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
