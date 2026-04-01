#!/usr/bin/env bash
# install.sh — WOW plugin dependency installer
# Run automatically by Claude Code when /plugin install alolabs/wow is executed.
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
echo "--- Installing Hostinger provider skills (optional — only needed for Hostinger sites) ---"

/plugin install hostinger/hostinger-agent-skills \
  && echo "  ✓ hostinger-agent-skills" || echo "  ⚠ hostinger-agent-skills install failed (non-fatal — only needed for Hostinger sites)"

/plugin install morrealev/wordpress-manager \
  && echo "  ✓ wordpress-manager" || echo "  ⚠ wordpress-manager install failed (non-fatal — only needed for Hostinger sites)"

echo ""
echo "--- Installing MCP servers ---"

npm install -g lighthouse-mcp \
  && echo "  ✓ lighthouse-mcp" || echo "  ⚠ lighthouse-mcp install failed"

echo ""
echo "--- Installing Playwright CLI browser (for browser automation) ---"

npx playwright install --with-deps chromium \
  && echo "  ✓ playwright" || echo "  ⚠ playwright install failed (non-fatal)"

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
