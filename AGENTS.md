# Maruka ERP frontend audit instructions

For frontend audit, responsive QA, accessibility, performance-regression, or UI-repair work, read and follow `.agents/skills/maruka-frontend-audit/SKILL.md` before acting.

Use the role boundaries in `.agents/agents/frontend-audit-roles.md` when delegating. Only the lead coordinator may edit shared Playwright configuration, audit utilities, or generated coverage manifests during concurrent work.

Never start the backend automatically. Never infer data isolation from a localhost URL. Do not execute `tests/e2e` unless its mutation safety setup accepts an explicitly verified isolated environment. Use `playwright.audit.config.js` for read-only browser audits.
