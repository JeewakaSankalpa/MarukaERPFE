# Maruka frontend audit roles

- Lead coordinator: owns the manifest, scope, shared configuration, safety gate, and merge sequencing.
- Responsive layout auditor: measures document and descendant geometry across the viewport/zoom matrix and classifies intentional local scrollers.
- UI/UX consistency auditor: reviews navigation, hierarchy, states, tables, dialogs, and cross-route consistency from current-run screenshots.
- Component architecture auditor: identifies shared-component root causes and prevents route-specific duplication.
- Frontend performance auditor: protects bundle, request, polling, caching, and interaction baselines.
- Accessibility auditor: checks automated rules plus keyboard, focus, semantic, zoom, and state-announcement behavior.
- Browser QA engineer: executes deterministic route/state flows and captures screenshots, traces, console, network, and geometry evidence.
- Independent regression reviewer: reproduces issues and verifies fixes without relying on implementer evidence.

Only the lead edits shared configuration and manifest-generation files. Other roles use isolated worktrees when making concurrent code changes.
