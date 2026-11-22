# Frontend audit progress dashboard

This dashboard distinguishes route/state coverage from component and interaction findings. Mock evidence is never presented as staging integration evidence.

## Cumulative coverage

| Measure | Current |
|---|---:|
| Declared routes | 114 |
| Unique declared paths | 112 |
| Route/state combinations | 248 |
| MOCK-VERIFIED | 85 |
| STAGING-VERIFIED | 0 |
| FAILED | 1 |
| BLOCKED | 0 |
| NOT TESTED | 162 |

## Sidebar-section modernization breakdown

Routes are deduplicated by declared path. “Nested” excludes each route’s initial state; verification percentage is mock-verified states divided by all route/state combinations in the section. Inventory and Procurement are combined as requested. The sidebar calls the requested Sales User Dashboard entry **Executive Dashboard** (`/executive-dashboard`).

| Section | Routes | Modernized | Improved | Not assessed | Nested | Mock verified | Untested/failed | Modernization | Verification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard | 1 | 1 | 0 | 0 | 2 | 1 | 2 | 100.0% | 25.0% |
| Sales User Dashboard (Executive Dashboard) | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| Project Summary Dashboard | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| Projects | 13 | 2 | 0 | 11 | 18 | 11 | 20 | 15.4% | 35.5% |
| Inventory & Procurement | 31 | 17 | 3 | 11 | 51 | 41 | 41 | 64.5% | 50.0% |
| HR & Team | 12 | 0 | 0 | 12 | 11 | 0 | 23 | 0.0% | 0.0% |
| Partners | 8 | 0 | 0 | 8 | 8 | 0 | 16 | 0.0% | 0.0% |
| Reports | 10 | 0 | 0 | 10 | 13 | 0 | 23 | 0.0% | 0.0% |
| Sales & Finance | 14 | 14 | 0 | 0 | 16 | 30 | 0 | 100.0% | 100.0% |
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
- Transfers Inbox: populated and searched queues, expanded item and batch details, decimal quantities, and QR verification feedback; responsive geometry, keyboard-reachable local table scrolling, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without accepting or rejecting stock.
- Expenses: financial summaries, category and payment-method breakdowns, manual record search, responsive transaction presentation, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without executing financial mutations.
- Accounts: five-category balance summaries, hierarchy-aware search, general and project tabs, parent sub-account summary, leaf transaction ledger, keyboard focus, responsive local table scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without executing financial mutations.
- Journals: balanced period summaries, reference/account search, status filtering, expanded debit and credit lines, keyboard focus, responsive local table scrolling, and the posting form's read-only layout and accessibility passed at desktop, intermediate, and mobile widths without posting or opening external documents.
- Financial Statements: income statement, balance sheet, and trial balance populated views, period controls, statement hierarchy, keyboard-focusable local table scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without financial mutations.
- Migration and its `/finance/migration-payables` alias: populated opening supplier payables and project receivables, financial summaries, invoice and project filtering, keyboard-focusable local table scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without financial mutations.
- Income: invoiced revenue, allocated invoice receipts, unallocated project payments, outstanding balances, cancelled-invoice exclusion, chart presentation, invoice and status filtering, keyboard-focusable local table scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without financial mutations.
- Petty Cash Approvals: fund-request and pending-expense totals, queue search, tab navigation, read-only review dialogs, keyboard-focusable local table scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without approving, rejecting, or posting ledger changes.
- Loan Management: company borrowing payables, employee loan receivables, direction filters, responsive portfolio cards, keyboard focus, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without opening payment-account-backed transaction flows.
- Asset Register: acquisition cost, carrying value, accumulated depreciation, portfolio search, responsive local table scrolling, keyboard focus, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without calculating depreciation or saving asset changes.
- Finance Dashboard: reporting-period controls, cash-flow summaries, inflow and outflow breakdowns, workspace navigation, keyboard focus, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without financial mutations.
- Supplier Payables: payable exposure summaries, due-date controls, populated supplier aging, keyboard-focusable local report scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without printing, opening documents, or executing financial mutations.
- Customer Receivables: receivable exposure summaries, customer-query and due-date controls, populated and empty aging states, keyboard-focusable local report scrolling, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without printing or executing financial mutations.
- Tax & VAT Management: read-only VAT and other-tax defaults, configuration readiness, refresh interaction, loading and recoverable error presentation, responsive table reflow, keyboard focus, overflow, and serious/critical accessibility checks passed at desktop, intermediate, and mobile widths without calculating tax, filing returns, changing settings, printing, or executing financial mutations.

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

- Chromium 1440, 1024, and 390: operational workspace geometry passed for the current batches, including Expenses, Accounts, Journals, Financial Statements, Migration, Income, Petty Cash Approvals, Loan Management, Asset Register, Finance Dashboard, Supplier Payables, Customer Receivables, and Tax & VAT Management.
- Chromium 1440, 1024, and 390: serious/critical automated accessibility checks passed for the current batches, including Expenses, Accounts, Journals, Financial Statements, Migration, Income, Petty Cash Approvals, Loan Management, Asset Register, Finance Dashboard, Supplier Payables, Customer Receivables, and Tax & VAT Management.
- Pending Purchases state and interaction checks: empty, loading, draft, supplier/quotation, and 300-row baseline passed; API error behavior is an expected failure.
- Firefox/WebKit coverage for the new operational batch remains pending.

The source of truth for individual records remains `route-coverage.json`; this file is the cumulative human-readable checkpoint.
