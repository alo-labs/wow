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
