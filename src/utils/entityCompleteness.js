const PLACEHOLDERS = new Set([
    'n/a',
    'na',
    'none',
    'null',
    'to be updated',
    'temp@example.com',
    '-'
]);

const label = (text) => text;

export const isMeaningful = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return true;
    const text = String(value).trim();
    return text.length > 0 && !PLACEHOLDERS.has(text.toLowerCase());
};

const field = (labelText, getter) => ({ label: label(labelText), getter });

export const completenessRules = {
    supplierPurchase: {
        entityLabel: 'Supplier',
        useLabel: 'purchase order',
        required: [
            field('Supplier name', s => s?.name),
            field('Phone or email', s => s?.phone || s?.email),
            field('Address line 1', s => s?.address?.line1),
            field('City or country', s => s?.address?.city || s?.address?.country)
        ],
        optional: [
            field('Supplier code', s => s?.supplierCode),
            field('Contact person', s => s?.contactPerson),
            field('Tax/VAT ID', s => s?.taxId)
        ]
    },
    productPurchase: {
        entityLabel: 'Product',
        useLabel: 'purchase order',
        required: [
            field('Product name', p => p?.name || p?.productNameSnapshot),
            field('SKU', p => p?.sku),
            field('Unit', p => p?.unit),
            field('Active status', p => p?.status)
        ],
        optional: [
            field('Original cost price', p => p?.originalCostPrice || p?.lastPurchasePrice),
            field('Reorder level', p => p?.reorderLevel)
        ]
    },
    customerProject: {
        entityLabel: 'Customer',
        useLabel: 'project or quotation',
        required: [
            field('Company name', c => c?.comName),
            field('Company address', c => c?.comAddress),
            field('Company phone or email', c => c?.comContactNumber || c?.comEmail),
            field('Contact person name', c => c?.contactPersonData?.name),
            field('Contact person phone or email', c => c?.contactPersonData?.contactNumber || c?.contactPersonData?.email)
        ],
        optional: [
            field('Business registration number', c => c?.businessRegNumber),
            field('Currency', c => c?.currency),
            field('Credit period', c => c?.creditPeriod)
        ],
        conditionalRequired: [
            {
                when: c => ['vat', 'vat registered', 'registered'].includes(String(c?.vatType || '').trim().toLowerCase()),
                fields: [
                    field('VAT number', c => c?.vatNumber)
                ]
            }
        ]
    },
    employeePayroll: {
        entityLabel: 'Employee',
        useLabel: 'payroll',
        required: [
            field('First name', e => e?.firstName),
            field('Username', e => e?.username),
            field('EPF / attendance code', e => e?.epfNo),
            field('Basic salary', e => Number(e?.basicSalary) > 0 ? e.basicSalary : ''),
            field('Join date', e => e?.joinDate)
        ],
        optional: [
            field('NIC number', e => e?.nicNumber),
            field('Department', e => e?.departmentId || e?.department?.name),
            field('Contact number', e => e?.contactNumber)
        ]
    },
    employeeAttendanceImport: {
        entityLabel: 'Employee',
        useLabel: 'attendance import',
        required: [
            field('First name', e => e?.firstName),
            field('EPF / attendance code', e => e?.epfNo)
        ],
        optional: [
            field('Join date', e => e?.joinDate),
            field('NIC number', e => e?.nicNumber)
        ]
    }
};

export const evaluateCompleteness = (rule, entity) => {
    const missingRequired = [];
    const missingOptional = [];

    (rule.required || []).forEach(item => {
        if (!isMeaningful(item.getter(entity))) missingRequired.push(item.label);
    });

    (rule.conditionalRequired || []).forEach(group => {
        if (group.when(entity)) {
            (group.fields || []).forEach(item => {
                if (!isMeaningful(item.getter(entity))) missingRequired.push(item.label);
            });
        }
    });

    (rule.optional || []).forEach(item => {
        if (!isMeaningful(item.getter(entity))) missingOptional.push(item.label);
    });

    return { missingRequired, missingOptional, isComplete: missingRequired.length === 0 };
};

export const buildCompletenessIssues = (ruleKey, entities, getName = item => item?.name || item?.comName || item?.firstName || 'Record') => {
    const rule = completenessRules[ruleKey];
    const list = Array.isArray(entities) ? entities : [entities];

    return list
        .filter(Boolean)
        .map(entity => ({
            entity,
            entityId: entity?.id || entity?.productId || entity?.supplierId,
            entityLabel: rule?.entityLabel || 'Record',
            ruleKey,
            name: getName(entity),
            ...evaluateCompleteness(rule, entity)
        }))
        .filter(issue => issue.missingRequired.length || issue.missingOptional.length);
};

export const hasBlockingIssues = (issues) => (issues || []).some(issue => issue.missingRequired.length > 0);
