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
