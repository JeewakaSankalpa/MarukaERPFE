# Frontend modernization checklist

Generated from `docs/audit/route-coverage.json`, `src/App.js`, and existing nested-state metadata. It tracks modernization separately from browser coverage; a loaded route is never automatically modernized or verified.

- Unique declared paths: 112
- Route/state combinations: 248
- Generated: 2026-11-17

## Status vocabulary

- `NOT ASSESSED`: code-derived inventory only; no design judgment yet.
- `CANDIDATE`: likely needs browser/design assessment.
- `IN PROGRESS`: current bounded modernization batch.
- `IMPROVED`: scoped repair completed; broader design assessment may remain.
- `MODERNIZED`: benchmark-quality redesign; avoid rework unless evidence requires it.

## Administration

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/user/create` | UserCreate | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/user/edit/:id` | UserCreate | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/user/search` | UserSearch | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/user/view/:id` | UserCreate | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |

## authenticated other

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/admin/item-request-trace` | ItemRequestTraceAdminPage | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/admin/portal-preview/customer/:id` | PortalPreviewRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/admin/portal-preview/supplier/:id` | PortalPreviewRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/dashboard` | Dashboard | 2 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/dashboard/interactive` | InteractiveDashboard | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/employee/profile` | EmployeeProfile | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/executive-dashboard` | ExecutiveDashboard | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/my-notifications` | MyNotificationsPage | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/notifications` | NotificationsPage | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/portal/customer` | PortalDashboard | 3 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/portal/supplier` | PortalDashboard | 3 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/project-summary-dashboard` | ProjectSummaryDashboard | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/settings` | SettingsPage | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/user/profile` | EmployeeProfile | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |

## Sales & finance

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/assets` | AssetRegister | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/finance/accounts` | AccountsPage | 2 | MOCK-VERIFIED (3/3 states) | MONITOR | MODERNIZED | Full-width account directory, five-category balance summary, nested ledger review, filters, responsive tables, and accessible financial presentation |
| `/finance/dashboard` | FinanceDashboard | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/finance/expenses` | ExpensesPage | 2 | MOCK-VERIFIED | MONITOR | MODERNIZED | Full-width expense review workspace modernized |
| `/finance/income` | IncomePage | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Full-width income and receivables review with financial hierarchy, responsive charts and register, accessible filtering, and guarded loading/error presentation |
| `/finance/journals` | JournalEntryList | 2 | MOCK-VERIFIED (3/3 states) | MONITOR | MODERNIZED | Full-width journal register, balanced debit/credit summaries, responsive line details, filters, and accessible posting form |
| `/finance/loans` | LoanManagement | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/finance/migration` | MigrationPayablesPage | 2 | MOCK-VERIFIED (3/3 states) | MONITOR | MODERNIZED | Full-width opening balance migration workspace with financial summaries, responsive registers, accessible filters, and guarded opening-balance forms |
| `/finance/migration-payables` | MigrationPayablesPage | 2 | MOCK-VERIFIED (3/3 states) | MONITOR | MODERNIZED | Verified alias of the modernized opening balance migration workspace; shared read-only behavior matches `/finance/migration` |
| `/finance/petty-cash-approvals` | PettyCashApprovalPage | 2 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/finance/reports` | FinanceReportsPage | 3 | MOCK-VERIFIED | MONITOR | MODERNIZED | Full-width financial statements workspace modernized |
| `/finance/tax` | TaxPage | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/reports/payables` | PayablesReport | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/reports/receivables` | ReceivablesReport | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |

## Human resources

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/attendance` | AttendancePage | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/employee/create` | EmployeeCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/employee/edit/:id` | EmployeeCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/employee/list` | EmployeeList | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/hr/config` | HRConfiguration | 6 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/hr/dashboard` | HRStatsDashboard | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/leave` | LeaveRequestPage | 2 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/reports/leave` | LeaveUtilizationReport | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/salary` | SalaryManagement | 3 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/salary/print-batch/:month` | SalaryBatchPrint | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/salary/report` | SalaryReport | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |

## Inventory

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/inventory` | InventoryDashboard | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Inventory Dashboard operational workspace redesigned |
| `/inventory/add` | InventoryAdd | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/inventory/audit-approvals` | StockAuditApprovalsPage | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/inventory/dashboard` | InventoryDashboard | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Inventory Dashboard operational workspace redesigned |
| `/inventory/pr` | PurchaseRequestPage | 6 | NOT TESTED | MONITOR | MODERNIZED | Products-benchmark purchase request workspace redesign complete |
| `/inventory/return` | InventoryReturn | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/inventory/return-to-inventory` | ReturnToInventory | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/inventory/returns/approvals` | InternalReturnApprovals | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/inventory/search` | InventoryView | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Products-benchmark inventory workspace redesign complete |
| `/inventory/stock-taking` | StockTakingPage | 2 | MOCK-VERIFIED (3/3 states) | HIGH | MODERNIZED | Full-width stock count workspace, discrepancy tabs, responsive batch table, and accessible quantity controls |
| `/inventory/supplier-returns/approvals` | SupplierReturnApprovals | 3 | MOCK-VERIFIED (4/4 states) | MONITOR | MODERNIZED | Full-width approval queues, readable quantity and financial review, responsive return cards, filtering, and accessible settlement history |
| `/inventory/view` | InventoryView | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Shared InventoryView modernized |
| `/item/add` | ItemAdd | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/item/my-requests` | MyRequestList | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Products-benchmark request workspace redesign complete |
| `/item/requests` | ItemRequestForm | 8 | NOT TESTED | MONITOR | IMPROVED | Operational workspace repair complete |
| `/item/requests/:id` | ItemRequestForm | 8 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/product/create` | ProductCreate | 2 | NOT TESTED | MONITOR | MODERNIZED | BENCHMARK — completed at commit 31f557f |
| `/reports/stock` | StockValuationReport | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/stores/fulfil-requests` | IRFulfilmentPage | 0 | MOCK-VERIFIED | MONITOR | IMPROVED | Existing responsive repair independently reverified |

## Partners

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/customer/create` | CustomerCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/customer/edit/:id` | CustomerCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/customer/view` | CustomerViewRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/partners/dashboard` | SupplierCustomerDashboard | 2 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/supplier/create` | SupplierCreate | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/supplier/search` | SupplierCreate | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |

## Procurement

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/grn` | GRNRouteWrapper | 0 | MOCK-VERIFIED | HIGH | MODERNIZED | Receive GRN full-width receiving workspace, responsive batch table, scoped payable summary, and accessible receipt controls |
| `/grns` | GRNListView | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | GRN History operational workspace redesigned |
| `/grns/:grnId/rate-correction` | GRNRateCorrectionPage | 0 | MOCK-VERIFIED | HIGH | MODERNIZED | Full-width correction workspace, readable financial review, responsive impact sections, and accessible admin controls; apply workflows remain integration-only |
| `/pos` | POListRouteWrapper | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | Previously modernized PO list |
| `/pos/:id` | PurchaseOrderDetails | 0 | MOCK-VERIFIED | MONITOR | MODERNIZED | PO Detail workspace redesigned |
| `/pos/:id/edit` | POEditManualRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/pos/:id/print` | POPrint | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/pos/create` | POCreateManualRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/procurement/dashboard` | ProcurementDashboard | 3 | MOCK-VERIFIED | MONITOR | MODERNIZED | Procurement operational dashboard redesigned |
| `/stores/pending-to-po` | PendingToPOPage | 11 | FAILED | MONITOR | IMPROVED | Shared workspace repair complete |
| `/stores/planning` | StoresPlanningPage | 4 | NOT TESTED | MONITOR | MODERNIZED | Products-benchmark operational redesign complete |
| `/transfers/inbox` | TransfersInbox | 4 | MOCK-VERIFIED (5/5 states) | MONITOR | MODERNIZED | Full-width transfer review workspace, visible source/destination routing, decimal quantities, responsive item details, filtering, and accessible batch verification |

## Projects

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/invoices/:id` | InvoiceView | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/invoices/:id/credit-note` | CreditNoteView | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/projects/:id` | ProjectCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/projects/:projectId/quotation` | QuotationPrint | 2 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/projects/create` | ProjectCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/projects/edit/:id` | ProjectCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/projects/estimation` | ProjectEstimationPage | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/projects/estimation/:id` | ProjectEstimationRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/projects/manage/:id` | ProjectDetails | 7 | MOCK-VERIFIED (3/8 states) | HIGH | MODERNIZED | Project workspace, saved financial summary, and revisions verified; workflow-dependent tabs and writes remain integration-only. |
| `/projects/search` | ProjectSearch | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/projects/tasks` | TaskControlCenter | 9 | NOT TESTED | MONITOR | MODERNIZED | Task Control Center responsive workspace and accessibility improvements verified |
| `/projects/view/:id` | ProjectCreate | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/projects/workflow` | WorkflowBuilder | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/reports/project-material` | ProjectMaterialReport | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |

## public

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/` | Navigate | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/login` | Login | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |

## Reports

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/reports` | ReportsPage | 5 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/reports/all-tasks` | AllTasksReport | 2 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/reports/sales-revenue` | SalesRevenueReport | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/reports/stock-control` | StockControlCenter | 6 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |

## Settings

| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |
|---|---|---:|---|---|---|---|
| `/admin/config` | SystemConfiguration | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/admin/notification-rules` | NotificationRulesPage | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/admin/portal-dashboard` | PortalDashboardSettings | 2 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/admin/roles` | RoleManagement | 0 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/admin/stock-verification` | StockVerificationPage | 4 | NOT TESTED | HIGH | NOT ASSESSED | CANDIDATE |
| `/admin/super-admin` | SuperAdminPage | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/admin/workflow` | WorkflowBuilder | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/admin/workflow/:id` | WorkflowBuilder | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/admin/workflows` | WorkflowList | 0 | NOT TESTED | MEDIUM | NOT ASSESSED | CANDIDATE |
| `/departments` | DepartmentListRouteWrapper | 6 | NOT TESTED | MONITOR | IMPROVED | Operational workspace repair complete |
| `/departments/:id` | DepartmentFormRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |
| `/departments/new` | DepartmentFormNewRouteWrapper | 0 | NOT TESTED | LOW | NOT ASSESSED | CANDIDATE |

## Next assessment queue

1. `/inventory/dashboard`, `/pos`, and `/grns` — dense inventory/procurement operations.
2. `/projects/*` operational detail and task-control surfaces.
3. `/finance/*` data-entry and approval surfaces.
4. `/inventory/pr` — populated state is presently blocked by a write-shaped summary request in the read-only harness.
