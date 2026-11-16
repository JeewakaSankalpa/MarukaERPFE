const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/audit/route-coverage.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'docs/audit/modernization-overrides.json'), 'utf8'));
const moduleLabels = {
    admin: 'Administration', hr: 'Human resources', inventory: 'Inventory', procurement: 'Procurement',
    partners: 'Partners', projects: 'Projects', finance: 'Sales & finance', reports: 'Reports', settings: 'Settings',
};
const routeGroups = new Map();
for (const row of manifest.rows.filter(row => row.declaration)) {
    const key = `${row.path}::${row.component || 'unknown'}`;
    const group = routeGroups.get(key) || { path: row.path, component: row.component || 'unknown', source: row.componentSource || '-', rows: [] };
    group.rows.push(row);
    routeGroups.set(key, group);
}
const grouped = new Map();
for (const route of routeGroups.values()) {
    const modules = route.rows[0].gate.modules || [];
    const module = modules[0]?.split('.')[0] || (route.rows[0].gate.authenticated ? 'authenticated-other' : 'public');
    const bucket = grouped.get(module) || [];
    bucket.push(route);
    grouped.set(module, bucket);
}
const statusRank = { FAILED: 0, BLOCKED: 1, 'NOT TESTED': 2, 'MOCK-VERIFIED': 3, 'STAGING-VERIFIED': 4 };
const statusSummary = rows => [...rows].sort((a, b) => statusRank[a.coverage.status] - statusRank[b.coverage.status])[0].coverage.status;
const priority = route => {
    const surfaces = route.rows.reduce((acc, row) => ({
        tables: acc.tables || row.surfaces.tables, forms: acc.forms || row.surfaces.forms, modals: acc.modals || row.surfaces.modals, tabs: acc.tabs || row.surfaces.tabs,
    }), {});
    const override = overrides[route.path];
    if (override?.modernization === 'IN PROGRESS') return 'NOW';
    if (override?.modernization === 'MODERNIZED' || override?.modernization === 'IMPROVED') return 'MONITOR';
    if (surfaces.tables && surfaces.forms) return 'HIGH';
    if (surfaces.tables || surfaces.forms || surfaces.tabs) return 'MEDIUM';
    return 'LOW';
};
const lines = [
    '# Frontend modernization checklist',
    '',
    'Generated from `docs/audit/route-coverage.json`, `src/App.js`, and existing nested-state metadata. It tracks modernization separately from browser coverage; a loaded route is never automatically modernized or verified.',
    '',
    `- Unique declared paths: ${manifest.summary.uniqueDeclaredPaths}`,
    `- Route/state combinations: ${manifest.summary.coverageRows}`,
    `- Generated: ${new Date().toISOString()}`,
    '',
    '## Status vocabulary',
    '',
    '- `NOT ASSESSED`: code-derived inventory only; no design judgment yet.',
    '- `CANDIDATE`: likely needs browser/design assessment.',
    '- `IN PROGRESS`: current bounded modernization batch.',
    '- `IMPROVED`: scoped repair completed; broader design assessment may remain.',
    '- `MODERNIZED`: benchmark-quality redesign; avoid rework unless evidence requires it.',
    '',
];
for (const [module, routes] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${moduleLabels[module] || module.replace(/-/g, ' ')}`, '', '| Route | Component | Nested states | Coverage | Priority | Modernization | Assessment |', '|---|---|---:|---|---|---|---|');
    for (const route of routes.sort((a, b) => a.path.localeCompare(b.path))) {
        const override = overrides[route.path] || {};
        const nested = route.rows.filter(row => row.state.kind !== 'route').length;
        lines.push(`| \`${route.path}\` | ${route.component} | ${nested} | ${statusSummary(route.rows)} | ${priority(route)} | ${override.modernization || 'NOT ASSESSED'} | ${override.assessment || 'CANDIDATE'} |`);
    }
    lines.push('');
}
lines.push('## Next assessment queue', '', '1. `/inventory/dashboard`, `/pos`, and `/grns` — dense inventory/procurement operations.', '2. `/projects/*` operational detail and task-control surfaces.', '3. `/finance/*` data-entry and approval surfaces.', '4. `/inventory/pr` — populated state is presently blocked by a write-shaped summary request in the read-only harness.', '');
fs.writeFileSync(path.join(root, 'docs/audit/modernization-checklist.md'), `${lines.join('\n')}\n`, 'utf8');
console.log(`Generated ${routeGroups.size} page entries.`);
