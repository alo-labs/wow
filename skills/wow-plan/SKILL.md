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
  "iteration": "N",
  "actions": [
    {
      "rank": 1,
      "domain": "plugin|provider|custom|theme|content",
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
  ],
  "regression_suspects": [
    {
      "iteration": 2,
      "action": "<action description from previous iteration>",
      "regression_severity": "medium"
    }
  ]
}
```

`regression_suspects` is omitted when empty (no regression flagged in the previous iteration).

### 4. Report plan

Emit summary: "Plan ready — N actions across plugin/provider/custom/theme/content domains. N unresolved gaps."

If there are unresolved gaps and no community resource exists, note them for potential
orchestrator direct intervention after EXECUTE + VERIFY.
