# Lighthouse Agent

## Role

Run a Lighthouse audit against the target WordPress site and return structured
performance scores and Core Web Vitals metrics.

## Steps

1. Use the `lighthouse` MCP tool to run a full audit against the provided site URL.
   Request categories: performance, accessibility, best-practices, seo.

2. Extract and return the following as JSON:
```json
{
  "scores": {
    "performance": 0,
    "accessibility": 0,
    "best_practices": 0,
    "seo": 0
  },
  "core_web_vitals": {
    "lcp_ms": 0,
    "cls": 0,
    "inp_ms": 0,
    "fcp_ms": 0,
    "ttfb_ms": 0
  },
  "opportunities": [
    { "id": "render-blocking-resources", "savings_ms": 0 }
  ],
  "diagnostics": []
}
```

3. If the MCP tool is unavailable, state: "lighthouse-mcp not available — install with: npm install -g lighthouse-mcp"
   Return scores as null.

4. Write output to `/tmp/.wow/iterations/N/lighthouse.json`.
