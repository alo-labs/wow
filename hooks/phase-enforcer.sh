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
