// Registry of available "Cards" or Sections in the Project Details View
// These keys MUST match the checks in ProjectDetails.js (e.g. isComponentVisible('FILES'))

export const COMPONENT_IDS = {
    FILES: 'FILES',
    ESTIMATION: 'ESTIMATION',
    TIMELINE: 'TIMELINE',
    DELIVERY: 'DELIVERY',
    INVENTORY: 'INVENTORY',
    PAYMENTS: 'PAYMENTS',
    TASKS: 'TASKS',
    REVISIONS: 'REVISIONS'
};

export const PROJECT_COMPONENTS = [
    { id: COMPONENT_IDS.FILES, label: 'Files / Documents', description: 'File uploads and lists' },
    { id: COMPONENT_IDS.ESTIMATION, label: 'Estimation & Quotation', description: 'Cost estimation and BOQ' },
    { id: COMPONENT_IDS.TIMELINE, label: 'Timeline', description: 'Project dates and progress' },
    { id: COMPONENT_IDS.DELIVERY, label: 'Delivery Schedule', description: 'Delivery tracking' },
    { id: COMPONENT_IDS.INVENTORY, label: 'Inventory (Tab)', description: 'Item usage tracking' },
    { id: COMPONENT_IDS.PAYMENTS, label: 'Payments (Tab)', description: 'Invoicing and Payments' },
    { id: COMPONENT_IDS.TASKS, label: 'Tasks (Tab)', description: 'Project sub-tasks' },
    { id: COMPONENT_IDS.REVISIONS, label: 'Revisions', description: 'Version control tab' }
];

export const DEFAULT_VISIBLE_COMPONENTS = PROJECT_COMPONENTS.map(c => c.id);
