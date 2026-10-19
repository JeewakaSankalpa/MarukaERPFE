// The visibility editor is driven by this registry so new project paths are
// added once and appear consistently in the workflow matrix.
export const PROJECT_VISIBILITY_PATHS = [
    {
        id: 'DASHBOARD', label: 'Dashboard', componentId: 'DASHBOARD', children: [
            { id: 'DASHBOARD.OVERVIEW', label: 'Project overview', componentId: 'OVERVIEW' },
            { id: 'DASHBOARD.STATUS', label: 'Current status and actions', componentId: 'STATUS' },
            { id: 'DASHBOARD.TIMELINE', label: 'Timeline', componentId: 'TIMELINE' },
            { id: 'DASHBOARD.FILES', label: 'Files', componentId: 'FILES', children: [
                { id: 'DASHBOARD.FILES.LIST', label: 'File list', componentId: 'FILES' },
                { id: 'DASHBOARD.FILES.UPLOAD', label: 'Upload files', componentId: 'FILES' },
                { id: 'DASHBOARD.FILES.DOWNLOAD', label: 'Download and preview', componentId: 'FILES' },
            ] },
            { id: 'DASHBOARD.COMMERCIAL_DOCUMENTS', label: 'Commercial documents', componentId: 'ESTIMATION', children: [
                { id: 'DASHBOARD.COMMERCIAL_DOCUMENTS.ESTIMATION', label: 'Estimation', componentId: 'ESTIMATION' },
                { id: 'DASHBOARD.COMMERCIAL_DOCUMENTS.QUOTATION', label: 'Quotation', componentId: 'ESTIMATION' },
            ] },
            { id: 'DASHBOARD.DELIVERY_SCHEDULE', label: 'Delivery schedule', componentId: 'DELIVERY' },
        ]
    },
    { id: 'REVISIONS', label: 'Revisions', componentId: 'REVISIONS', children: [
        { id: 'REVISIONS.HISTORY', label: 'Revision history', componentId: 'REVISIONS' },
        { id: 'REVISIONS.SNAPSHOT', label: 'View revision snapshot', componentId: 'REVISIONS' },
        { id: 'REVISIONS.REQUEST', label: 'Request revision', componentId: 'REVISIONS' },
    ] },
    { id: 'INVENTORY', label: 'Inventory', componentId: 'INVENTORY', children: [
        { id: 'INVENTORY.SUMMARY', label: 'Inventory summary', componentId: 'INVENTORY' },
        { id: 'INVENTORY.ALLOCATIONS', label: 'Project allocations', componentId: 'INVENTORY' },
        { id: 'INVENTORY.HISTORY', label: 'Inventory history', componentId: 'INVENTORY' },
    ] },
    { id: 'TASKS', label: 'Tasks', componentId: 'TASKS', children: [
        { id: 'TASKS.LIST', label: 'Task list', componentId: 'TASKS' },
        { id: 'TASKS.CREATE', label: 'Create task', componentId: 'TASKS' },
        { id: 'TASKS.UPDATE', label: 'Update task', componentId: 'TASKS' },
    ] },
    { id: 'COMMUNICATION', label: 'Communication', componentId: 'COMMUNICATION', children: [
        { id: 'COMMUNICATION.COMMENTS', label: 'Project comments', componentId: 'COMMUNICATION' },
        { id: 'COMMUNICATION.EMAIL', label: 'Project email', componentId: 'COMMUNICATION' },
    ] },
    { id: 'WORKFLOW', label: 'Workflow', componentId: 'WORKFLOW', children: [
        { id: 'WORKFLOW.STAGE', label: 'Current stage', componentId: 'WORKFLOW' },
        { id: 'WORKFLOW.TRANSITIONS', label: 'Stage transitions', componentId: 'WORKFLOW' },
        { id: 'WORKFLOW.APPROVALS', label: 'Approvals', componentId: 'APPROVALS' },
    ] },
    { id: 'FINANCE', label: 'Finance', componentId: 'FINANCE', children: [
        { id: 'FINANCE.PAYMENTS', label: 'Payments', componentId: 'PAYMENTS' },
        { id: 'FINANCE.BALANCE', label: 'Balance and totals', componentId: 'FINANCE' },
        { id: 'FINANCE.TRANSACTIONS', label: 'Financial transactions', componentId: 'FINANCE' },
    ] },
];

export const flattenVisibilityPaths = (nodes = PROJECT_VISIBILITY_PATHS, depth = 0) => nodes.flatMap(node => [
    { ...node, depth },
    ...flattenVisibilityPaths(node.children || [], depth + 1),
]);

export const VISIBILITY_PATH_ROWS = flattenVisibilityPaths();
