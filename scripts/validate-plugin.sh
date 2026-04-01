#!/usr/bin/env bash
# validate-plugin.sh — verifies WOW plugin structure and JSON validity
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required. Install: brew install jq (macOS) / apt install jq (Linux)"; exit 1; }
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
valid_json()  { jq empty "$1" >/dev/null 2>&1 && echo "ok" || echo "invalid JSON: $1"; }
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
