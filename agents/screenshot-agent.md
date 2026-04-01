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
  "iteration": "N",
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
