# Frontend audit progress dashboard

This dashboard distinguishes route/state coverage from component and interaction findings. Mock evidence is never presented as staging integration evidence.

## Cumulative coverage

| Measure | Current |
|---|---:|
| Declared routes | 114 |
| Unique declared paths | 112 |
| Route/state combinations | 242 |
| MOCK-VERIFIED | 49 |
| STAGING-VERIFIED | 0 |
| FAILED | 1 |
| BLOCKED | 0 |
| NOT TESTED | 192 |

## Sidebar-section modernization breakdown

Routes are deduplicated by declared path. “Nested” excludes each route’s initial state; verification percentage is mock-verified states divided by all route/state combinations in the section. Inventory and Procurement are combined as requested. The sidebar calls the requested Sales User Dashboard entry **Executive Dashboard** (`/executive-dashboard`).

| Section | Routes | Modernized | Improved | Not assessed | Nested | Mock verified | Untested/failed | Modernization | Verification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard | 1 | 0 | 0 | 1 | 2 | 0 | 3 | 0.0% | 0.0% |
| Sales User Dashboard (Executive Dashboard) | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| Project Summary Dashboard | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| Projects | 13 | 2 | 0 | 11 | 18 | 11 | 20 | 15.4% | 35.5% |
| Inventory & Procurement | 31 | 16 | 3 | 12 | 47 | 36 | 42 | 61.3% | 46.2% |
| HR & Team | 12 | 0 | 0 | 12 | 11 | 0 | 23 | 0.0% | 0.0% |
| Partners | 8 | 0 | 0 | 8 | 8 | 0 | 16 | 0.0% | 0.0% |
| Reports | 10 | 0 | 0 | 10 | 13 | 0 | 23 | 0.0% | 0.0% |
| Sales & Finance | 14 | 0 | 0 | 14 | 14 | 0 | 28 | 0.0% | 0.0% |
| Settings | 18 | 0 | 1 | 17 | 13 | 1 | 30 | 5.6% | 3.2% |

Seven declared paths are outside this sidebar breakdown: public login/root and user-administration/profile routes. They remain in the route manifest and are not counted twice here.

## Current verified route/state work

- Pending Purchases: populated, product-filtered, empty, loading, seeded draft, supplier/quotation interaction, and 300-row performance baseline.
- Stores Planning: Products-benchmark modernized populated shortages; independently mock-verified at desktop, laptop, and mobile widths.
- Purchase Requests: populated product workspace and Enter-triggered search; draft/save/submit/delete and print remain integration-only.
- Item Request: blank manual request and populated product-search results.
- Departments: populated first page.
- Task Control Center: overview, list, Kanban, Gantt, workforce, calendar, reports, and the read-only task-detail drawer at desktop, laptop, and mobile widths.
- Project Manage: dashboard, persisted estimation summary, email-modal opening, and revisions at desktop, laptop, and mobile widths.
- Receive GRN: PO loading, receipt details, batch-entry interaction, local table scrolling, responsive geometry, and serious/critical accessibility checks at desktop, intermediate, and mobile widths.
- GRN Rate Correction: selected-batch review, VAT/rate validation, read-only impact analysis, financial hierarchy, responsive geometry, and serious/critical accessibility checks at desktop, intermediate, and mobile widths.
- Stock Taking: All Batches and Changed Items states, physical quantity discrepancy review, local table scrolling, responsive geometry, and serious/critical accessibility checks at desktop, intermediate, and mobile widths.
- Supplier Return Approvals: pending, approved, rejected, search-filtered, and settlement-history states; responsive geometry and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without executing mutations.
- Procurement Dashboard: populated KPI and PO-status overview, decimal shortage quantities, supplier search, and PO-status filtering; responsive geometry, local table scrolling, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths.

## Shared components

| Component | Result |
|---|---|
| Header command trigger | MOCK-VERIFIED accessible name |
| Sidebar navigation | MOCK-VERIFIED navigation landmark, native controls, and `aria-current` |
| Command palette | MOCK-VERIFIED modal semantics, initial focus, Escape close, and focus restoration |
| Branded dialog | Focus containment implemented; focused unit expansion remains pending |
| Responsive table containment | MOCK-VERIFIED on the current operational batch |

## Open findings

| Severity | Open | Fixed and independently verified |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 0 | 4 across batches 1-2 |
| Medium | 5 | 0 |
| Low | 1 | 0 |

The Project Stores component has no application route, import, or menu entry. This remains a product/navigation decision, not a CSS repair.

## Browser regression matrix

- Chromium 1440, 1024, and 390: operational workspace geometry passed for the current batches, including Procurement Dashboard.
- Chromium 1440, 1024, and 390: serious/critical automated accessibility checks passed for the current batches, including Procurement Dashboard.
- Pending Purchases state and interaction checks: empty, loading, draft, supplier/quotation, and 300-row baseline passed; API error behavior is an expected failure.
- Firefox/WebKit coverage for the new operational batch remains pending.

The source of truth for individual records remains `route-coverage.json`; this file is the cumulative human-readable checkpoint.
