---
name: Versioning Scheme
description: WOW uses semver with patch = YYYYMMDD + 2-digit daily build serial (e.g., 1.0.2026040201)
type: project
---

WOW versioning is semver where the patch component is the current date (YYYYMMDD) plus a two-digit serial number for the build number of that day.

Example: `1.0.2026040201` = major 1, minor 0, patch 2026040201 (first build on 2026-04-02).

**Why:** Encodes the build date directly into the version for traceability.

**How to apply:** When tagging releases or writing version numbers, use this format. The daily serial resets to 01 each day and increments for subsequent builds on the same day.
