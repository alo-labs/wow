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
BELOW=$(echo "$DELTA_PCT $THRESHOLD" | LC_NUMERIC=C awk '{print ($1 < $2) ? "true" : "false"}')

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
jq --arg reason "$STOP_REASON" \
  ".stop = $STOP | .stop_reason = \$reason | .consecutive_below_threshold = $CONSECUTIVE" \
  "$DELTA_FILE" > /tmp/.wow/delta.tmp && mv /tmp/.wow/delta.tmp "$DELTA_FILE"

if [ "$STOP" = "true" ]; then
  echo "🏁 WOW: Optimization complete. Reason: $STOP_REASON"
fi

exit 0
