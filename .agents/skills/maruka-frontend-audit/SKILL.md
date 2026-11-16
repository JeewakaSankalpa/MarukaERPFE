---
name: maruka-frontend-audit
description: Audit Maruka ERP frontend routes, responsive layouts, accessibility, and regressions while enforcing read-only browser traffic and evidence-backed coverage statuses.
---

# Maruka Frontend Audit

Use the repository's `playwright.audit.config.js`; never route audit work through the legacy state-mutating `tests/e2e` suite.

Before browser execution, require the environment validation in `tests/audit/support/environment.js`. A localhost frontend is not evidence of isolation: inspect the effective API target independently, never start the backend automatically, and never accept a production target. Runtime fetch/XHR traffic must match the validated frontend or API origin; WebSockets are blocked in read-only mode.

Do not perform interactive login during a read-only audit. For isolated mock runs, test-only authentication may be injected exclusively from `tests/audit/` after the network guard has rejected production and mutating traffic; it must never alter application code or enter a production build. For staging integration, use only protected `playwright/.auth/` storage state created for a verified non-production read-only persona. If a protected route lacks safe authentication or fixtures, leave it `NOT TESTED` before an attempt and mark it `BLOCKED` only after the attempted audit establishes that limitation.

Use the coverage manifest in `docs/audit/route-coverage.json`. Keep initial and unobserved entries `NOT TESTED`; use `BLOCKED` when an attempted check cannot proceed for a recorded external prerequisite, `FAILED` when observed behavior violates an expectation, `MOCK-VERIFIED` only for deterministic test-harness evidence, and `STAGING-VERIFIED` only for a confirmed safe staging integration. Rendering alone is insufficient; require route identity, expected state or interaction, console/network evidence, layout geometry, and applicable keyboard/accessibility checks. Never promote mock evidence to staging evidence. Manifest regeneration preserves evidence by stable ID.

Classify overflow by root cause: document overflow, clipped/inaccessible content, legitimate local table/Gantt/timeline scrolling, or print-specific layout. Name every permitted local scroller, prove it is reachable, and exclude its descendants from page-level overflow failures. Do not hide defects with broad overflow suppression.

For each issue follow `docs/audit/issue.schema.json` and attach current-run screenshot or measurement evidence. A different agent must independently verify significant fixes; initial audit conclusions may be recorded by the executing auditor but remain distinct from fix verification.

Preserve auth/module gates, business workflows, API behavior, project-detail lazy boundaries, request cancellation, caching, polling limits, and print behavior. UI repairs should be narrow and evidence-driven.
