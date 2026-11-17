# Route coverage manifest

Generated from `src/App.js` at revision `245df3d7734206481e3ab104e0b0a250787d1a96`.

- Route declarations: 114
- Unique declared paths: 112
- Coverage rows including nested states: 248
- Status counts: `MOCK-VERIFIED` 70, `STAGING-VERIFIED` 0, `FAILED` 1, `BLOCKED` 0, `NOT TESTED` 177

| ID | Path | Component | State | Gate | Status |
|---|---|---|---|---|---|
| ROUTE-login-initial-route-state | `/login` | Login | initial route state | public/unknown | MOCK-VERIFIED |
| ROUTE-root-initial-route-state | `/` | Navigate | initial route state | public/unknown | MOCK-VERIFIED |
| ROUTE-portal-customer-initial-route-state | `/portal/customer` | PortalDashboard | initial route state | CUSTOMER, CUSTOMER_PORTAL | MOCK-VERIFIED |
| ROUTE-portal-customer-overview-tab | `/portal/customer` | PortalDashboard | overview tab | CUSTOMER, CUSTOMER_PORTAL | MOCK-VERIFIED |
| ROUTE-portal-customer-communications-tab | `/portal/customer` | PortalDashboard | communications tab | CUSTOMER, CUSTOMER_PORTAL | NOT TESTED |
| ROUTE-portal-customer-visibility-dependent-tab | `/portal/customer` | PortalDashboard | visibility-dependent tab | CUSTOMER, CUSTOMER_PORTAL | NOT TESTED |
| ROUTE-portal-supplier-initial-route-state | `/portal/supplier` | PortalDashboard | initial route state | SUPPLIER, SUPPLIER_PORTAL | NOT TESTED |
| ROUTE-portal-supplier-overview-tab | `/portal/supplier` | PortalDashboard | overview tab | SUPPLIER, SUPPLIER_PORTAL | NOT TESTED |
| ROUTE-portal-supplier-communications-tab | `/portal/supplier` | PortalDashboard | communications tab | SUPPLIER, SUPPLIER_PORTAL | NOT TESTED |
| ROUTE-portal-supplier-visibility-dependent-tab | `/portal/supplier` | PortalDashboard | visibility-dependent tab | SUPPLIER, SUPPLIER_PORTAL | NOT TESTED |
| ROUTE-dashboard-initial-route-state | `/dashboard` | Dashboard | initial route state | authenticated | NOT TESTED |
| ROUTE-dashboard-pending-approvals-all | `/dashboard` | Dashboard | pending approvals: all | authenticated | NOT TESTED |
| ROUTE-dashboard-pending-approvals-dynamic-approval-type | `/dashboard` | Dashboard | pending approvals: dynamic approval type | authenticated | NOT TESTED |
| ROUTE-dashboard-interactive-initial-route-state | `/dashboard/interactive` | InteractiveDashboard | initial route state | authenticated | NOT TESTED |
| ROUTE-notifications-initial-route-state | `/notifications` | NotificationsPage | initial route state | authenticated | NOT TESTED |
| ROUTE-notifications-duplicate-2-initial-route-state | `/notifications` | NotificationsPage | initial route state | authenticated | NOT TESTED |
| ROUTE-settings-initial-route-state | `/settings` | SettingsPage | initial route state | authenticated | NOT TESTED |
| ROUTE-my-notifications-initial-route-state | `/my-notifications` | MyNotificationsPage | initial route state | authenticated | NOT TESTED |
| ROUTE-user-profile-initial-route-state | `/user/profile` | EmployeeProfile | initial route state | authenticated | NOT TESTED |
| ROUTE-employee-profile-initial-route-state | `/employee/profile` | EmployeeProfile | initial route state | authenticated | NOT TESTED |
| ROUTE-executive-dashboard-initial-route-state | `/executive-dashboard` | ExecutiveDashboard | initial route state | ADMIN, SUPER_ADMIN | NOT TESTED |
| ROUTE-project-summary-dashboard-initial-route-state | `/project-summary-dashboard` | ProjectSummaryDashboard | initial route state | ADMIN, SUPER_ADMIN | NOT TESTED |
| ROUTE-admin-portal-preview-customer-id-initial-route-state | `/admin/portal-preview/customer/:id` | PortalPreviewRouteWrapper | initial route state | ADMIN, SUPER_ADMIN | NOT TESTED |
| ROUTE-admin-portal-preview-supplier-id-initial-route-state | `/admin/portal-preview/supplier/:id` | PortalPreviewRouteWrapper | initial route state | ADMIN, SUPER_ADMIN | NOT TESTED |
| ROUTE-admin-item-request-trace-initial-route-state | `/admin/item-request-trace` | ItemRequestTraceAdminPage | initial route state | ADMIN, SUPER_ADMIN | NOT TESTED |
| ROUTE-user-create-initial-route-state | `/user/create` | UserCreate | initial route state | admin | NOT TESTED |
| ROUTE-user-search-initial-route-state | `/user/search` | UserSearch | initial route state | admin | NOT TESTED |
| ROUTE-user-edit-id-initial-route-state | `/user/edit/:id` | UserCreate | initial route state | admin | NOT TESTED |
| ROUTE-user-view-id-initial-route-state | `/user/view/:id` | UserCreate | initial route state | admin | NOT TESTED |
| ROUTE-employee-create-initial-route-state | `/employee/create` | EmployeeCreate | initial route state | hr | NOT TESTED |
| ROUTE-employee-edit-id-initial-route-state | `/employee/edit/:id` | EmployeeCreate | initial route state | hr | NOT TESTED |
| ROUTE-employee-list-initial-route-state | `/employee/list` | EmployeeList | initial route state | hr | NOT TESTED |
| ROUTE-salary-initial-route-state | `/salary` | SalaryManagement | initial route state | hr | NOT TESTED |
| ROUTE-salary-processing-tab | `/salary` | SalaryManagement | processing tab | hr | NOT TESTED |
| ROUTE-salary-config-tab | `/salary` | SalaryManagement | config tab | hr | NOT TESTED |
| ROUTE-salary-attendance-tab | `/salary` | SalaryManagement | attendance tab | hr | NOT TESTED |
| ROUTE-hr-config-initial-route-state | `/hr/config` | HRConfiguration | initial route state | hr | NOT TESTED |
| ROUTE-hr-config-schedule-tab | `/hr/config` | HRConfiguration | schedule tab | hr | NOT TESTED |
| ROUTE-hr-config-leave-tab | `/hr/config` | HRConfiguration | leave tab | hr | NOT TESTED |
| ROUTE-hr-config-audit-tab | `/hr/config` | HRConfiguration | audit tab | hr | NOT TESTED |
| ROUTE-hr-config-notifications-tab | `/hr/config` | HRConfiguration | notifications tab | hr | NOT TESTED |
| ROUTE-hr-config-tax-tab | `/hr/config` | HRConfiguration | tax tab | hr | NOT TESTED |
| ROUTE-hr-config-roles-tab | `/hr/config` | HRConfiguration | roles tab | hr | NOT TESTED |
| ROUTE-hr-dashboard-initial-route-state | `/hr/dashboard` | HRStatsDashboard | initial route state | hr | NOT TESTED |
| ROUTE-salary-report-initial-route-state | `/salary/report` | SalaryReport | initial route state | hr | NOT TESTED |
| ROUTE-salary-print-batch-month-initial-route-state | `/salary/print-batch/:month` | SalaryBatchPrint | initial route state | hr | NOT TESTED |
| ROUTE-leave-initial-route-state | `/leave` | LeaveRequestPage | initial route state | hr | NOT TESTED |
| ROUTE-leave-my-leaves-tab | `/leave` | LeaveRequestPage | my-leaves tab | hr | NOT TESTED |
| ROUTE-leave-approvals-tab | `/leave` | LeaveRequestPage | approvals tab | hr | NOT TESTED |
| ROUTE-attendance-initial-route-state | `/attendance` | AttendancePage | initial route state | hr | NOT TESTED |
| ROUTE-reports-leave-initial-route-state | `/reports/leave` | LeaveUtilizationReport | initial route state | hr | NOT TESTED |
| ROUTE-inventory-initial-route-state | `/inventory` | InventoryDashboard | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-dashboard-initial-route-state | `/inventory/dashboard` | InventoryDashboard | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-add-initial-route-state | `/inventory/add` | InventoryAdd | initial route state | inventory | NOT TESTED |
| ROUTE-item-add-initial-route-state | `/item/add` | ItemAdd | initial route state | inventory | NOT TESTED |
| ROUTE-inventory-search-initial-route-state | `/inventory/search` | InventoryView | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-view-initial-route-state | `/inventory/view` | InventoryView | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-return-initial-route-state | `/inventory/return` | InventoryReturn | initial route state | inventory | NOT TESTED |
| ROUTE-inventory-return-to-inventory-initial-route-state | `/inventory/return-to-inventory` | ReturnToInventory | initial route state | inventory | NOT TESTED |
| ROUTE-inventory-returns-approvals-initial-route-state | `/inventory/returns/approvals` | InternalReturnApprovals | initial route state | inventory | NOT TESTED |
| ROUTE-inventory-supplier-returns-approvals-initial-route-state | `/inventory/supplier-returns/approvals` | SupplierReturnApprovals | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-supplier-returns-approvals-pending-state | `/inventory/supplier-returns/approvals` | SupplierReturnApprovals | pending state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-supplier-returns-approvals-approved-state | `/inventory/supplier-returns/approvals` | SupplierReturnApprovals | approved state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-supplier-returns-approvals-rejected-state | `/inventory/supplier-returns/approvals` | SupplierReturnApprovals | rejected state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-stock-taking-initial-route-state | `/inventory/stock-taking` | StockTakingPage | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-stock-taking-all-items-state | `/inventory/stock-taking` | StockTakingPage | all items state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-stock-taking-changed-items-state | `/inventory/stock-taking` | StockTakingPage | changed items state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-audit-approvals-initial-route-state | `/inventory/audit-approvals` | StockAuditApprovalsPage | initial route state | inventory | NOT TESTED |
| ROUTE-product-create-initial-route-state | `/product/create` | ProductCreate | initial route state | inventory | NOT TESTED |
| ROUTE-product-create-details-tab | `/product/create` | ProductCreate | details tab | inventory | NOT TESTED |
| ROUTE-product-create-stock-tab | `/product/create` | ProductCreate | stock tab | inventory | NOT TESTED |
| ROUTE-inventory-pr-initial-route-state | `/inventory/pr` | PurchaseRequestPage | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-inventory-pr-empty-product-list | `/inventory/pr` | PurchaseRequestPage | empty product list | inventory | MOCK-VERIFIED |
| ROUTE-inventory-pr-populated-product-list | `/inventory/pr` | PurchaseRequestPage | populated product list | inventory | MOCK-VERIFIED |
| ROUTE-inventory-pr-saved-drafts-table | `/inventory/pr` | PurchaseRequestPage | saved drafts table | inventory | NOT TESTED |
| ROUTE-inventory-pr-filtered-products | `/inventory/pr` | PurchaseRequestPage | filtered products | inventory | MOCK-VERIFIED |
| ROUTE-inventory-pr-loading-products | `/inventory/pr` | PurchaseRequestPage | loading products | inventory | NOT TESTED |
| ROUTE-inventory-pr-api-error-state | `/inventory/pr` | PurchaseRequestPage | API error state | inventory | NOT TESTED |
| ROUTE-item-requests-initial-route-state | `/item/requests` | ItemRequestForm | initial route state | inventory | NOT TESTED |
| ROUTE-item-requests-blank-manual-request | `/item/requests` | ItemRequestForm | blank manual request | inventory | MOCK-VERIFIED |
| ROUTE-item-requests-product-search-results | `/item/requests` | ItemRequestForm | product search results | inventory | MOCK-VERIFIED |
| ROUTE-item-requests-cargills-materials-estimation | `/item/requests` | ItemRequestForm | CARGILLS_MATERIALS estimation | inventory | NOT TESTED |
| ROUTE-item-requests-cargills-panels-estimation | `/item/requests` | ItemRequestForm | CARGILLS_PANELS estimation | inventory | NOT TESTED |
| ROUTE-item-requests-standard-estimation-components | `/item/requests` | ItemRequestForm | standard estimation components | inventory | NOT TESTED |
| ROUTE-item-requests-saved-project-drafts | `/item/requests` | ItemRequestForm | saved project drafts | inventory | NOT TESTED |
| ROUTE-item-requests-loading-estimation | `/item/requests` | ItemRequestForm | loading estimation | inventory | NOT TESTED |
| ROUTE-item-requests-api-error-state | `/item/requests` | ItemRequestForm | API error state | inventory | NOT TESTED |
| ROUTE-item-requests-id-initial-route-state | `/item/requests/:id` | ItemRequestForm | initial route state | inventory | NOT TESTED |
| ROUTE-item-requests-id-blank-manual-request | `/item/requests/:id` | ItemRequestForm | blank manual request | inventory | NOT TESTED |
| ROUTE-item-requests-id-product-search-results | `/item/requests/:id` | ItemRequestForm | product search results | inventory | NOT TESTED |
| ROUTE-item-requests-id-cargills-materials-estimation | `/item/requests/:id` | ItemRequestForm | CARGILLS_MATERIALS estimation | inventory | NOT TESTED |
| ROUTE-item-requests-id-cargills-panels-estimation | `/item/requests/:id` | ItemRequestForm | CARGILLS_PANELS estimation | inventory | NOT TESTED |
| ROUTE-item-requests-id-standard-estimation-components | `/item/requests/:id` | ItemRequestForm | standard estimation components | inventory | NOT TESTED |
| ROUTE-item-requests-id-saved-project-drafts | `/item/requests/:id` | ItemRequestForm | saved project drafts | inventory | NOT TESTED |
| ROUTE-item-requests-id-loading-estimation | `/item/requests/:id` | ItemRequestForm | loading estimation | inventory | NOT TESTED |
| ROUTE-item-requests-id-api-error-state | `/item/requests/:id` | ItemRequestForm | API error state | inventory | NOT TESTED |
| ROUTE-item-my-requests-initial-route-state | `/item/my-requests` | MyRequestList | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-stores-fulfil-requests-initial-route-state | `/stores/fulfil-requests` | IRFulfilmentPage | initial route state | inventory | MOCK-VERIFIED |
| ROUTE-reports-stock-initial-route-state | `/reports/stock` | StockValuationReport | initial route state | inventory | NOT TESTED |
| ROUTE-procurement-dashboard-initial-route-state | `/procurement/dashboard` | ProcurementDashboard | initial route state | procurement | MOCK-VERIFIED |
| ROUTE-procurement-dashboard-populated-overview | `/procurement/dashboard` | ProcurementDashboard | populated overview | procurement | MOCK-VERIFIED |
| ROUTE-procurement-dashboard-searched-activity | `/procurement/dashboard` | ProcurementDashboard | searched activity | procurement | MOCK-VERIFIED |
| ROUTE-procurement-dashboard-status-filtered-deliveries | `/procurement/dashboard` | ProcurementDashboard | status-filtered deliveries | procurement | MOCK-VERIFIED |
| ROUTE-stores-planning-initial-route-state | `/stores/planning` | StoresPlanningPage | initial route state | procurement | NOT TESTED |
| ROUTE-stores-planning-populated-shortages | `/stores/planning` | StoresPlanningPage | populated shortages | procurement | MOCK-VERIFIED |
| ROUTE-stores-planning-empty-shortages | `/stores/planning` | StoresPlanningPage | empty shortages | procurement | NOT TESTED |
| ROUTE-stores-planning-loading-shortages | `/stores/planning` | StoresPlanningPage | loading shortages | procurement | NOT TESTED |
| ROUTE-stores-planning-api-error-state | `/stores/planning` | StoresPlanningPage | API error state | procurement | NOT TESTED |
| ROUTE-stores-pending-to-po-initial-route-state | `/stores/pending-to-po` | PendingToPOPage | initial route state | procurement | NOT TESTED |
| ROUTE-stores-pending-to-po-populated-allocation-table | `/stores/pending-to-po` | PendingToPOPage | populated allocation table | procurement | MOCK-VERIFIED |
| ROUTE-stores-pending-to-po-product-filtered-table | `/stores/pending-to-po` | PendingToPOPage | product-filtered table | procurement | MOCK-VERIFIED |
| ROUTE-stores-pending-to-po-empty-pending-purchases | `/stores/pending-to-po` | PendingToPOPage | empty pending purchases | procurement | MOCK-VERIFIED |
| ROUTE-stores-pending-to-po-loading-pending-purchases | `/stores/pending-to-po` | PendingToPOPage | loading pending purchases | procurement | MOCK-VERIFIED |
| ROUTE-stores-pending-to-po-api-error-state | `/stores/pending-to-po` | PendingToPOPage | API error state | procurement | FAILED |
| ROUTE-stores-pending-to-po-completeness-modal | `/stores/pending-to-po` | PendingToPOPage | completeness modal | procurement | NOT TESTED |
| ROUTE-stores-pending-to-po-edit-supplier-modal | `/stores/pending-to-po` | PendingToPOPage | edit supplier modal | procurement | NOT TESTED |
| ROUTE-stores-pending-to-po-edit-product-modal | `/stores/pending-to-po` | PendingToPOPage | edit product modal | procurement | NOT TESTED |
| ROUTE-stores-pending-to-po-saved-drafts-table | `/stores/pending-to-po` | PendingToPOPage | saved drafts table | procurement | MOCK-VERIFIED |
| ROUTE-stores-pending-to-po-supplier-and-quotation-interaction | `/stores/pending-to-po` | PendingToPOPage | supplier and quotation interaction | procurement | MOCK-VERIFIED |
| ROUTE-stores-pending-to-po-300-row-performance-baseline | `/stores/pending-to-po` | PendingToPOPage | 300-row performance baseline | procurement | MOCK-VERIFIED |
| ROUTE-transfers-inbox-initial-route-state | `/transfers/inbox` | TransfersInbox | initial route state | procurement | NOT TESTED |
| ROUTE-transfers-inbox-populated-queue | `/transfers/inbox` | TransfersInbox | populated queue | procurement | MOCK-VERIFIED |
| ROUTE-transfers-inbox-searched-queue | `/transfers/inbox` | TransfersInbox | searched queue | procurement | MOCK-VERIFIED |
| ROUTE-transfers-inbox-expanded-transfer-details | `/transfers/inbox` | TransfersInbox | expanded transfer details | procurement | MOCK-VERIFIED |
| ROUTE-transfers-inbox-verified-batch-scan | `/transfers/inbox` | TransfersInbox | verified batch scan | procurement | MOCK-VERIFIED |
| ROUTE-pos-initial-route-state | `/pos` | POListRouteWrapper | initial route state | procurement | MOCK-VERIFIED |
| ROUTE-pos-create-initial-route-state | `/pos/create` | POCreateManualRouteWrapper | initial route state | procurement | NOT TESTED |
| ROUTE-pos-id-print-initial-route-state | `/pos/:id/print` | POPrint | initial route state | procurement | NOT TESTED |
| ROUTE-pos-id-edit-initial-route-state | `/pos/:id/edit` | POEditManualRouteWrapper | initial route state | procurement | NOT TESTED |
| ROUTE-pos-id-initial-route-state | `/pos/:id` | PurchaseOrderDetails | initial route state | procurement | MOCK-VERIFIED |
| ROUTE-grn-initial-route-state | `/grn` | GRNRouteWrapper | initial route state | procurement | NOT TESTED |
| ROUTE-grns-initial-route-state | `/grns` | GRNListView | initial route state | procurement | MOCK-VERIFIED |
| ROUTE-grns-grnid-rate-correction-initial-route-state | `/grns/:grnId/rate-correction` | GRNRateCorrectionPage | initial route state | procurement | NOT TESTED |
| ROUTE-partners-dashboard-initial-route-state | `/partners/dashboard` | SupplierCustomerDashboard | initial route state | partners | NOT TESTED |
| ROUTE-partners-dashboard-customers-tab | `/partners/dashboard` | SupplierCustomerDashboard | customers tab | partners | NOT TESTED |
| ROUTE-partners-dashboard-suppliers-tab | `/partners/dashboard` | SupplierCustomerDashboard | suppliers tab | partners | NOT TESTED |
| ROUTE-customer-create-initial-route-state | `/customer/create` | CustomerCreate | initial route state | partners | NOT TESTED |
| ROUTE-customer-view-initial-route-state | `/customer/view` | CustomerViewRouteWrapper | initial route state | partners | NOT TESTED |
| ROUTE-customer-edit-id-initial-route-state | `/customer/edit/:id` | CustomerCreate | initial route state | partners | NOT TESTED |
| ROUTE-supplier-create-initial-route-state | `/supplier/create` | SupplierCreate | initial route state | partners | NOT TESTED |
| ROUTE-supplier-search-initial-route-state | `/supplier/search` | SupplierCreate | initial route state | partners | NOT TESTED |
| ROUTE-projects-create-initial-route-state | `/projects/create` | ProjectCreate | initial route state | projects | NOT TESTED |
| ROUTE-projects-search-initial-route-state | `/projects/search` | ProjectSearch | initial route state | projects | NOT TESTED |
| ROUTE-projects-tasks-initial-route-state | `/projects/tasks` | TaskControlCenter | initial route state | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-overview-tab | `/projects/tasks` | TaskControlCenter | overview tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-list-tab | `/projects/tasks` | TaskControlCenter | list tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-board-tab | `/projects/tasks` | TaskControlCenter | board tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-gantt-tab | `/projects/tasks` | TaskControlCenter | gantt tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-workforce-tab | `/projects/tasks` | TaskControlCenter | workforce tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-calendar-tab | `/projects/tasks` | TaskControlCenter | calendar tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-reports-tab | `/projects/tasks` | TaskControlCenter | reports tab | projects | MOCK-VERIFIED |
| ROUTE-projects-tasks-task-create-drawer | `/projects/tasks` | TaskControlCenter | task create drawer | projects | NOT TESTED |
| ROUTE-projects-tasks-task-edit-drawer | `/projects/tasks` | TaskControlCenter | task edit drawer | projects | MOCK-VERIFIED |
| ROUTE-projects-id-initial-route-state | `/projects/:id` | ProjectCreate | initial route state | projects | NOT TESTED |
| ROUTE-projects-edit-id-initial-route-state | `/projects/edit/:id` | ProjectCreate | initial route state | projects | NOT TESTED |
| ROUTE-projects-view-id-initial-route-state | `/projects/view/:id` | ProjectCreate | initial route state | projects | NOT TESTED |
| ROUTE-projects-manage-id-initial-route-state | `/projects/manage/:id` | ProjectDetails | initial route state | projects | NOT TESTED |
| ROUTE-projects-manage-id-dashboard-tab | `/projects/manage/:id` | ProjectDetails | dashboard tab | projects | MOCK-VERIFIED |
| ROUTE-projects-manage-id-revisions-tab | `/projects/manage/:id` | ProjectDetails | revisions tab | projects | MOCK-VERIFIED |
| ROUTE-projects-manage-id-inventory-tab | `/projects/manage/:id` | ProjectDetails | inventory tab | projects | NOT TESTED |
| ROUTE-projects-manage-id-tasks-tab | `/projects/manage/:id` | ProjectDetails | tasks tab | projects | NOT TESTED |
| ROUTE-projects-manage-id-communication-tab | `/projects/manage/:id` | ProjectDetails | communication tab | projects | NOT TESTED |
| ROUTE-projects-manage-id-workflow-tab | `/projects/manage/:id` | ProjectDetails | workflow tab | projects | NOT TESTED |
| ROUTE-projects-manage-id-finance-tab | `/projects/manage/:id` | ProjectDetails | finance tab | projects | NOT TESTED |
| ROUTE-projects-workflow-initial-route-state | `/projects/workflow` | WorkflowBuilder | initial route state | projects | NOT TESTED |
| ROUTE-projects-estimation-initial-route-state | `/projects/estimation` | ProjectEstimationPage | initial route state | projects | NOT TESTED |
| ROUTE-projects-estimation-id-initial-route-state | `/projects/estimation/:id` | ProjectEstimationRouteWrapper | initial route state | projects | NOT TESTED |
| ROUTE-projects-projectid-quotation-initial-route-state | `/projects/:projectId/quotation` | QuotationPrint | initial route state | projects | NOT TESTED |
| ROUTE-projects-projectid-quotation-quotation-state | `/projects/:projectId/quotation` | QuotationPrint | quotation state | projects | NOT TESTED |
| ROUTE-projects-projectid-quotation-invoices-state | `/projects/:projectId/quotation` | QuotationPrint | invoices state | projects | NOT TESTED |
| ROUTE-invoices-id-initial-route-state | `/invoices/:id` | InvoiceView | initial route state | projects | NOT TESTED |
| ROUTE-invoices-id-credit-note-initial-route-state | `/invoices/:id/credit-note` | CreditNoteView | initial route state | projects | NOT TESTED |
| ROUTE-reports-project-material-initial-route-state | `/reports/project-material` | ProjectMaterialReport | initial route state | projects | NOT TESTED |
| ROUTE-finance-dashboard-initial-route-state | `/finance/dashboard` | FinanceDashboard | initial route state | finance | NOT TESTED |
| ROUTE-finance-accounts-initial-route-state | `/finance/accounts` | AccountsPage | initial route state | finance | MOCK-VERIFIED |
| ROUTE-finance-accounts-general-accounts-tab | `/finance/accounts` | AccountsPage | General Accounts tab | finance | MOCK-VERIFIED |
| ROUTE-finance-accounts-project-accounts-tab | `/finance/accounts` | AccountsPage | Project Accounts tab | finance | MOCK-VERIFIED |
| ROUTE-finance-journals-initial-route-state | `/finance/journals` | JournalEntryList | initial route state | finance | MOCK-VERIFIED |
| ROUTE-finance-journals-expanded-journal-details | `/finance/journals` | JournalEntryList | expanded journal details | finance | MOCK-VERIFIED |
| ROUTE-finance-journals-new-journal-form | `/finance/journals` | JournalEntryList | new journal form | finance | MOCK-VERIFIED |
| ROUTE-finance-expenses-initial-route-state | `/finance/expenses` | ExpensesPage | initial route state | finance | MOCK-VERIFIED |
| ROUTE-finance-expenses-category-tab | `/finance/expenses` | ExpensesPage | category tab | finance | MOCK-VERIFIED |
| ROUTE-finance-expenses-method-tab | `/finance/expenses` | ExpensesPage | method tab | finance | MOCK-VERIFIED |
| ROUTE-finance-tax-initial-route-state | `/finance/tax` | TaxPage | initial route state | finance | NOT TESTED |
| ROUTE-finance-loans-initial-route-state | `/finance/loans` | LoanManagement | initial route state | finance | NOT TESTED |
| ROUTE-finance-loans-duplicate-2-initial-route-state | `/finance/loans` | LoanManagement | initial route state | finance | NOT TESTED |
| ROUTE-finance-income-initial-route-state | `/finance/income` | IncomePage | initial route state | finance | NOT TESTED |
| ROUTE-finance-reports-initial-route-state | `/finance/reports` | FinanceReportsPage | initial route state | finance | MOCK-VERIFIED |
| ROUTE-finance-reports-profit-and-loss-tab | `/finance/reports` | FinanceReportsPage | profit and loss tab | finance | MOCK-VERIFIED |
| ROUTE-finance-reports-balance-sheet-tab | `/finance/reports` | FinanceReportsPage | balance sheet tab | finance | MOCK-VERIFIED |
| ROUTE-finance-reports-trial-balance-tab | `/finance/reports` | FinanceReportsPage | trial balance tab | finance | MOCK-VERIFIED |
| ROUTE-finance-migration-initial-route-state | `/finance/migration` | MigrationPayablesPage | initial route state | finance | MOCK-VERIFIED |
| ROUTE-finance-migration-payables-tab | `/finance/migration` | MigrationPayablesPage | payables tab | finance | MOCK-VERIFIED |
| ROUTE-finance-migration-receivables-tab | `/finance/migration` | MigrationPayablesPage | receivables tab | finance | MOCK-VERIFIED |
| ROUTE-finance-migration-payables-initial-route-state | `/finance/migration-payables` | MigrationPayablesPage | initial route state | finance | NOT TESTED |
| ROUTE-finance-migration-payables-payables-tab | `/finance/migration-payables` | MigrationPayablesPage | payables tab | finance | NOT TESTED |
| ROUTE-finance-migration-payables-receivables-tab | `/finance/migration-payables` | MigrationPayablesPage | receivables tab | finance | NOT TESTED |
| ROUTE-reports-payables-initial-route-state | `/reports/payables` | PayablesReport | initial route state | finance | NOT TESTED |
| ROUTE-reports-receivables-initial-route-state | `/reports/receivables` | ReceivablesReport | initial route state | finance | NOT TESTED |
| ROUTE-assets-initial-route-state | `/assets` | AssetRegister | initial route state | finance | NOT TESTED |
| ROUTE-finance-petty-cash-approvals-initial-route-state | `/finance/petty-cash-approvals` | PettyCashApprovalPage | initial route state | finance | NOT TESTED |
| ROUTE-finance-petty-cash-approvals-fund-requests-tab | `/finance/petty-cash-approvals` | PettyCashApprovalPage | Fund Requests tab | finance | NOT TESTED |
| ROUTE-finance-petty-cash-approvals-pending-expenses-tab | `/finance/petty-cash-approvals` | PettyCashApprovalPage | Pending Expenses tab | finance | NOT TESTED |
| ROUTE-reports-stock-control-initial-route-state | `/reports/stock-control` | StockControlCenter | initial route state | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-stock-control-overview-tab | `/reports/stock-control` | StockControlCenter | overview tab | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-stock-control-locations-tab | `/reports/stock-control` | StockControlCenter | locations tab | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-stock-control-products-tab | `/reports/stock-control` | StockControlCenter | products tab | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-stock-control-movements-tab | `/reports/stock-control` | StockControlCenter | movements tab | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-stock-control-exceptions-tab | `/reports/stock-control` | StockControlCenter | exceptions tab | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-stock-control-stock-breakdown-drawer | `/reports/stock-control` | StockControlCenter | stock-breakdown drawer | reports, reports.stock_control | NOT TESTED |
| ROUTE-reports-initial-route-state | `/reports` | ReportsPage | initial route state | reports | NOT TESTED |
| ROUTE-reports-hr-report-tab | `/reports` | ReportsPage | HR report tab | reports | NOT TESTED |
| ROUTE-reports-revenue-report-tab | `/reports` | ReportsPage | revenue report tab | reports | NOT TESTED |
| ROUTE-reports-stock-report-tab | `/reports` | ReportsPage | stock report tab | reports | NOT TESTED |
| ROUTE-reports-payables-report-tab | `/reports` | ReportsPage | payables report tab | reports | NOT TESTED |
| ROUTE-reports-receivables-report-tab | `/reports` | ReportsPage | receivables report tab | reports | NOT TESTED |
| ROUTE-reports-sales-revenue-initial-route-state | `/reports/sales-revenue` | SalesRevenueReport | initial route state | reports | NOT TESTED |
| ROUTE-reports-all-tasks-initial-route-state | `/reports/all-tasks` | AllTasksReport | initial route state | reports | NOT TESTED |
| ROUTE-reports-all-tasks-tasks-tab | `/reports/all-tasks` | AllTasksReport | tasks tab | reports | NOT TESTED |
| ROUTE-reports-all-tasks-workers-tab | `/reports/all-tasks` | AllTasksReport | workers tab | reports | NOT TESTED |
| ROUTE-admin-config-initial-route-state | `/admin/config` | SystemConfiguration | initial route state | settings | NOT TESTED |
| ROUTE-admin-super-admin-initial-route-state | `/admin/super-admin` | SuperAdminPage | initial route state | ADMIN, SUPER_ADMIN, settings | NOT TESTED |
| ROUTE-admin-workflows-initial-route-state | `/admin/workflows` | WorkflowList | initial route state | settings | NOT TESTED |
| ROUTE-admin-notification-rules-initial-route-state | `/admin/notification-rules` | NotificationRulesPage | initial route state | settings | NOT TESTED |
| ROUTE-admin-roles-initial-route-state | `/admin/roles` | RoleManagement | initial route state | settings | NOT TESTED |
| ROUTE-admin-portal-dashboard-initial-route-state | `/admin/portal-dashboard` | PortalDashboardSettings | initial route state | settings | NOT TESTED |
| ROUTE-admin-portal-dashboard-customer-tab | `/admin/portal-dashboard` | PortalDashboardSettings | customer tab | settings | NOT TESTED |
| ROUTE-admin-portal-dashboard-supplier-tab | `/admin/portal-dashboard` | PortalDashboardSettings | supplier tab | settings | NOT TESTED |
| ROUTE-admin-stock-verification-initial-route-state | `/admin/stock-verification` | StockVerificationPage | initial route state | settings | NOT TESTED |
| ROUTE-admin-stock-verification-reconciliation-tab-missing | `/admin/stock-verification` | StockVerificationPage | reconciliation tab: missing | settings | NOT TESTED |
| ROUTE-admin-stock-verification-reconciliation-tab-matched | `/admin/stock-verification` | StockVerificationPage | reconciliation tab: matched | settings | NOT TESTED |
| ROUTE-admin-stock-verification-reconciliation-tab-unknown | `/admin/stock-verification` | StockVerificationPage | reconciliation tab: unknown | settings | NOT TESTED |
| ROUTE-admin-stock-verification-sku-tab | `/admin/stock-verification` | StockVerificationPage | SKU tab | settings | NOT TESTED |
| ROUTE-admin-workflow-initial-route-state | `/admin/workflow` | WorkflowBuilder | initial route state | settings | NOT TESTED |
| ROUTE-admin-workflow-id-initial-route-state | `/admin/workflow/:id` | WorkflowBuilder | initial route state | settings | NOT TESTED |
| ROUTE-departments-initial-route-state | `/departments` | DepartmentListRouteWrapper | initial route state | settings | NOT TESTED |
| ROUTE-departments-populated-first-page | `/departments` | DepartmentListRouteWrapper | populated first page | settings | MOCK-VERIFIED |
| ROUTE-departments-empty-departments | `/departments` | DepartmentListRouteWrapper | empty departments | settings | NOT TESTED |
| ROUTE-departments-status-filtered-departments | `/departments` | DepartmentListRouteWrapper | status-filtered departments | settings | NOT TESTED |
| ROUTE-departments-searched-departments | `/departments` | DepartmentListRouteWrapper | searched departments | settings | NOT TESTED |
| ROUTE-departments-detail-modal | `/departments` | DepartmentListRouteWrapper | detail modal | settings | NOT TESTED |
| ROUTE-departments-api-error-state | `/departments` | DepartmentListRouteWrapper | API error state | settings | NOT TESTED |
| ROUTE-departments-new-initial-route-state | `/departments/new` | DepartmentFormNewRouteWrapper | initial route state | settings | NOT TESTED |
| ROUTE-departments-id-initial-route-state | `/departments/:id` | DepartmentFormRouteWrapper | initial route state | settings | NOT TESTED |
| NAV-inventory-reports | `/inventory/reports` | unresolved | navigation target without exact route declaration | public/unknown | NOT TESTED |
| NAV-employee-view | `/employee/view` | unresolved | navigation target without exact route declaration | public/unknown | NOT TESTED |
| NAV-sales-quotations | `/sales/quotations` | unresolved | navigation target without exact route declaration | public/unknown | NOT TESTED |
| NAV-sales-quotations-new | `/sales/quotations/new` | unresolved | navigation target without exact route declaration | public/unknown | NOT TESTED |
