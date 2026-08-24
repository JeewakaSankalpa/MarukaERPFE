# Design

> Auto-generated and maintained by frontend-god-mode.
> Source of truth for typography, color, motion, layout, and component tokens.
> Read this BEFORE touching the UI in any subsequent session.

## Aesthetic direction

Maruka ERP uses a refined operational portal style: blue-led, professional, compact, and built for quickly scanning project and order status.

## Dials

- DESIGN_VARIANCE: 5 / 10
- MOTION_INTENSITY: 2 / 10
- VISUAL_DENSITY: 6 / 10

## Type stack

- Display: Existing application sans stack
- Body: Existing application sans stack
- Loaded via: Current CRA stylesheet imports
- Portal rule: preserve the existing Maruka visual identity and do not introduce new global font dependencies.

## Color tokens

```css
:root {
  --maruka-blue: #007bff;
  --maruka-navy: #1e3a8a;
  --portal-ink: #172033;
  --portal-muted: #526176;
  --portal-panel: #fbfdff;
  --portal-border: rgba(162, 178, 207, 0.34);
  --portal-success: #166534;
  --portal-warning: #854d0e;
  --portal-danger: #991b1b;
  --portal-info: #075985;
}
```

Supporting colors are for status meaning only: success, warning, danger, neutral, and info. Status is always paired with text and an icon.

## Shadows

- Portal lift: tinted blue shadows such as `rgba(30, 58, 138, 0.10)`.
- Avoid untinted black shadows in portal UI.

## Motion

- Motion is minimal and functional.
- Loading skeletons use reduced-motion-safe shimmer.
- Do not add decorative animation to project cards.

## Layout

- Portal container: `max-width: 1320px`, centered.
- Project/order layout: separated cards with a top identity/status row, core progress/date/action row, secondary detail grid, then expandable details.
- Mobile: stack filters, project core blocks, and detail grids into one column.
- Do not modify main website, admin portal, staff dashboard, or global navigation layouts.

## Component inventory

- PortalDashboard
- CustomerProjectCard
- SupplierOrderCard
- PortalFilters
- StatusBadge
- ProgressSummary
- DateSignal
- ActionSignal
- Portal loading, empty, error, and filtered-empty states

## Project-specific bans

- No portal status communicated by color alone.
- No fabricated progress percentage when no real denominator exists.
- No unrelated shared component changes for portal polish.
- No main website, admin portal, or staff dashboard visual changes.
- No marketing-page patterns inside operational portal screens.

## Brand voice

- Customer wording: plain, calm, and non-technical.
- Supplier wording: action-oriented and specific.
- Button labels use clear verbs such as "View details", "Hide details", "Refresh", and "Clear filters".

## Accessibility floor

- WCAG AA contrast target for body copy.
- Visible focus states for portal inputs and actions.
- Mobile touch targets at least 44px.
- Icons are decorative unless paired with accessible text.
- Loading state uses `aria-live`; portal shell exposes busy state.

## Last updated

2026-08-01 by Codex: added Customer Portal and Supplier Portal project interface guidance.
2026-08-20 by Codex: refined Project Estimation component totals into compact per-component operational blocks with a summary strip and grouped pricing/logistics controls; avoid returning this section to a wide scroll table.
2026-08-21 by Codex: added Project Estimation autosave/status guidance; keep draft recovery, official save, submit gating, and save history visible near the top and summarized again near workflow history.
2026-08-21 by Codex: added Project Estimation template-management guidance; templates stay compact and operational, expose save/preview/insert/delete states inline, and insert saved templates as new component columns rather than overwriting existing columns.
2026-08-21 by Codex: added global notification/dialog guidance; toasts and in-app confirmations use compact Maruka-branded surfaces, while browser beforeunload remains a last-resort native tab-close safety prompt because Chrome does not allow styling it.
2026-08-24 by Codex: clarified Item Request component-tab workflow; project estimation request drafts preserve all component tabs, keep General visible for overflow allocations, and save/submit only the active component without erasing untouched component rows.
