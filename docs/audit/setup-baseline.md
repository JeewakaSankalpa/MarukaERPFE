# Audit setup baseline — 2026-11-12

## Safety baseline

- The frontend working tree was clean before setup.
- The frontend `.env` points to a public non-loopback API. Its value is intentionally not copied into committed audit artifacts.
- The local backend configuration can connect to a remote MongoDB Atlas database. The audit configuration never starts the backend.
- Existing `tests/e2e` stories reset passwords and create business records. They remain excluded from `playwright.audit.config.js`.
- Application browser audits are blocked until explicitly confirmed non-production frontend and API targets are supplied.

## Build and unit baseline

- Production build: PASS with pre-existing CRA/Browserslist and ESLint warnings.
- Unit tests: 2 suites passed, 3 tests passed.
- Detailed bundle measurements: `build-baseline.json`.
- Playwright audit discovery: separate read-only suite with desktop, intermediate, tablet, mobile, reflow, Firefox, and WebKit projects.
- Browser engines: Chromium, Firefox, and WebKit launch successfully on an isolated blank page using the existing user browser cache.

## Lazy-loading investigation

- Current `src/App.js` has no route-level `React.lazy` boundary and approximately 96 eager route-component imports.
- No current local/remote branch, reachable commit, reflog entry, or stash contains the previously described route-level lazy-loading implementation.
- No `globalStyles.js` or matching index import exists in reachable history.
- The earlier optimization was therefore most likely uncommitted worktree-only code that was later overwritten or discarded. Git cannot identify the exact discard event for uncommitted content.
- Existing code splitting remains in project-detail registries: ten components in `DefaultComponents.js` and four task views in `TasksContainer.js`.
- Route-level lazy loading is technically restorable, but it is not a setup-phase change. CSS order must first be made deterministic because Bootstrap is imported from two eagerly loaded search components today; lazy routes could otherwise make Bootstrap load order route-dependent.

## Known baseline risks

- Main JavaScript is substantially larger than CRA's recommendation.
- `caniuse-lite` data is stale.
- CRA 5 is unmaintained and emits a warning about an undeclared Babel proposal plugin.
- Numerous existing ESLint warnings remain; this setup does not modify application behavior to address them.
- Authenticated and data-dependent routes remain `NOT TESTED` until a safe read-only persona/storage state and non-production fixtures are available.
