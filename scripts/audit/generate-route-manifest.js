const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const nestedStates = require('./nested-states');

const root = path.resolve(__dirname, '../..');
const appPath = path.join(root, 'src/App.js');
const existingManifestPath = path.join(root, 'docs/audit/route-coverage.json');
const existingComponentPath = path.join(root, 'docs/audit/component-inventory.json');
const previousRows = fs.existsSync(existingManifestPath)
    ? new Map(JSON.parse(fs.readFileSync(existingManifestPath, 'utf8')).rows.map((row) => [row.id, row]))
    : new Map();
const previousComponents = fs.existsSync(existingComponentPath)
    ? new Map(JSON.parse(fs.readFileSync(existingComponentPath, 'utf8')).files.map((entry) => [entry.source, entry]))
    : new Map();
const source = fs.readFileSync(appPath, 'utf8');
const menuSource = fs.readFileSync(path.join(root, 'src/resources/MenuConfig.js'), 'utf8');
const menuPaths = new Set([...menuSource.matchAll(/path:\s*["'](\/[^"]*?)["']/g)].map((match) => match[1]));
const queryFixtures = {
    '/grn': ['poId'],
    '/admin/portal-preview/customer/:id': ['name'],
    '/admin/portal-preview/supplier/:id': ['name'],
};
const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
const imports = new Map();
const declarations = [];

traverse(ast, {
    ImportDeclaration(importPath) {
        for (const specifier of importPath.node.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier') imports.set(specifier.local.name, importPath.node.source.value);
        }
    },
    JSXElement(routePath) {
        if (jsxName(routePath.node.openingElement.name) !== 'Route') return;
        const route = readRoute(routePath.node);
        if (!route.path) return;
        const gates = [];
        let parent = routePath.parentPath;
        while (parent) {
            if (parent.isJSXElement() && jsxName(parent.node.openingElement.name) === 'Route') {
                const ancestor = readRoute(parent.node);
                if (ancestor.privateRoute) gates.unshift(ancestor.privateRoute);
            }
            parent = parent.parentPath;
        }
        if (route.privateRoute) gates.push(route.privateRoute);
        declarations.push({ ...route, gates, line: routePath.node.loc.start.line });
    },
});

const seen = new Map();
const rows = [];
for (const declaration of declarations) {
    const count = (seen.get(declaration.path) || 0) + 1;
    seen.set(declaration.path, count);
    const componentSource = imports.get(declaration.component);
    const surface = inspectSurface(componentSource);
    const base = makeRow(declaration, count, componentSource, surface, 'initial route state', 'route');
    rows.push(base);
    for (const stateName of nestedStates[declaration.component] || []) {
        rows.push(makeRow(declaration, count, componentSource, surface, stateName, stateName.includes('drawer') ? 'drawer' : 'tab-or-state'));
    }
}

const navigationOrphans = ['/inventory/reports', '/employee/view', '/sales/quotations', '/sales/quotations/new'];
for (const orphan of navigationOrphans) {
    rows.push({
        id: `NAV-${slug(orphan)}`,
        path: orphan,
        declaration: null,
        component: null,
        componentSource: null,
        gate: { authenticated: null, roles: [], modules: [] },
        entry: { menu: false, workflow: true, parameters: [], query: [] },
        state: { name: 'navigation target without exact route declaration', kind: 'navigation-risk', fixture: null, mutationAllowed: false },
        surfaces: emptySurfaces(),
        expectations: expectations(),
        coverage: coverage(),
        notes: ['Static navigation reference; runtime reachability not established.'],
    });
}

for (const row of rows) {
    const previous = previousRows.get(row.id);
    if (previous?.coverage) row.coverage = previous.coverage;
}

const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRevision: runGitHead(),
    schemaVersion: 1,
    allowedStatuses: ['MOCK-VERIFIED', 'STAGING-VERIFIED', 'FAILED', 'BLOCKED', 'NOT TESTED'],
    summary: {
        routeDeclarations: declarations.length,
        uniqueDeclaredPaths: seen.size,
        duplicatePaths: [...seen.entries()].filter(([, count]) => count > 1).map(([routePath, count]) => ({ path: routePath, declarations: count })),
        coverageRows: rows.length,
        navigationTargetsWithoutExactRoute: navigationOrphans.length,
    },
    rows,
};

const docs = path.join(root, 'docs/audit');
fs.mkdirSync(docs, { recursive: true });
fs.writeFileSync(path.join(docs, 'route-coverage.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(docs, 'route-coverage.md'), markdown(manifest));
fs.writeFileSync(path.join(docs, 'component-inventory.json'), `${JSON.stringify(componentInventory(), null, 2)}\n`);
console.log(`Generated ${rows.length} coverage rows from ${declarations.length} route declarations (${seen.size} unique paths).`);

function readRoute(element) {
    const attrs = new Map(element.openingElement.attributes.filter((item) => item.type === 'JSXAttribute').map((item) => [item.name.name, item.value]));
    const routePath = literalValue(attrs.get('path'));
    const elementValue = attrs.get('element');
    const component = firstComponent(elementValue);
    const privateNode = findComponent(elementValue, 'PrivateRoute');
    return { path: routePath, component, privateRoute: privateNode ? privateGate(privateNode) : null };
}

function privateGate(node) {
    const attrs = new Map(node.openingElement.attributes.filter((item) => item.type === 'JSXAttribute').map((item) => [item.name.name, item.value]));
    return { module: literalValue(attrs.get('module')), roles: arrayValues(attrs.get('roles')), authenticated: true };
}

function firstComponent(value) {
    const expression = value?.type === 'JSXExpressionContainer' ? value.expression : value;
    if (expression?.type !== 'JSXElement') return null;
    const name = jsxName(expression.openingElement.name);
    if (name !== 'PrivateRoute') return name;
    for (const child of expression.children || []) {
        const nested = firstComponent(child);
        if (nested) return nested;
    }
    return name;
}

function findComponent(value, name) {
    const expression = value?.type === 'JSXExpressionContainer' ? value.expression : value;
    if (!expression || expression.type !== 'JSXElement') return null;
    if (jsxName(expression.openingElement.name) === name) return expression;
    for (const child of expression.children || []) {
        const found = findComponent(child, name);
        if (found) return found;
    }
    return null;
}

function literalValue(value) {
    if (!value) return null;
    if (value.type === 'StringLiteral') return value.value;
    if (value.type === 'JSXExpressionContainer' && value.expression.type === 'StringLiteral') return value.expression.value;
    return null;
}

function arrayValues(value) {
    const expression = value?.type === 'JSXExpressionContainer' ? value.expression : null;
    if (!expression || expression.type !== 'ArrayExpression') return [];
    return expression.elements.filter(Boolean).map((item) => item.value).filter(Boolean);
}

function jsxName(node) {
    if (!node) return null;
    if (node.type === 'JSXIdentifier') return node.name;
    if (node.type === 'JSXMemberExpression') return `${jsxName(node.object)}.${jsxName(node.property)}`;
    return null;
}

function inspectSurface(importSource) {
    if (!importSource?.startsWith('.')) return emptySurfaces();
    const absoluteBase = path.resolve(path.dirname(appPath), importSource);
    const candidates = [absoluteBase, `${absoluteBase}.js`, `${absoluteBase}.jsx`, path.join(absoluteBase, 'index.js')];
    const file = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) return emptySurfaces();
    const content = fs.readFileSync(file, 'utf8');
    return {
        forms: matches(content, /<form\b|Form\.|<Form\b/),
        tables: matches(content, /<table\b|\bTable\b|DataTable/),
        modals: matches(content, /\bModal\b|\bDialog\b/),
        drawers: matches(content, /\bDrawer\b|drawer/i),
        dropdowns: matches(content, /\bDropdown\b|<select\b|\bSelect\b/),
        loading: matches(content, /loading|spinner|skeleton/i),
        empty: matches(content, /empty state|no (data|records|items|results)/i),
        error: matches(content, /error|catch\s*\(/i),
    };
}

function matches(content, regex) { return regex.test(content); }
function emptySurfaces() { return { forms: false, tables: false, modals: false, drawers: false, dropdowns: false, loading: false, empty: false, error: false }; }
function coverage() { return { status: 'NOT TESTED', browser: null, viewport: null, zoom: null, evidence: [], blocker: null, verifiedAt: null }; }
function expectations() { return { identity: null, pageOverflowAllowed: false, permittedLocalScrollers: [], keyboardChecks: [], networkPolicy: 'GET_HEAD_OPTIONS_ONLY' }; }

function makeRow(declaration, duplicateIndex, componentSource, surfaces, stateName, kind) {
    const modules = declaration.gates.map((gate) => gate.module).filter(Boolean);
    const roles = [...new Set(declaration.gates.flatMap((gate) => gate.roles || []))];
    const parameters = [...declaration.path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    return {
        id: `ROUTE-${slug(declaration.path)}${duplicateIndex > 1 ? `-duplicate-${duplicateIndex}` : ''}-${slug(stateName)}`,
        path: declaration.path,
        declaration: { source: 'src/App.js', line: declaration.line, duplicateIndex },
        component: declaration.component,
        componentSource,
        gate: { authenticated: declaration.gates.length > 0, roles, modules },
        entry: {
            menu: menuPaths.has(declaration.path),
            workflow: !menuPaths.has(declaration.path),
            parameters,
            query: queryFixtures[declaration.path] || [],
        },
        state: { name: stateName, kind, fixture: null, mutationAllowed: false },
        surfaces,
        expectations: expectations(),
        coverage: coverage(),
        notes: [],
    };
}

function markdown(data) {
    const statusCounts = Object.fromEntries(data.allowedStatuses.map((status) => [status, data.rows.filter((row) => row.coverage.status === status).length]));
    const lines = [
        '# Route coverage manifest', '',
        `Generated from \`src/App.js\` at revision \`${data.sourceRevision}\`.`, '',
        `- Route declarations: ${data.summary.routeDeclarations}`,
        `- Unique declared paths: ${data.summary.uniqueDeclaredPaths}`,
        `- Coverage rows including nested states: ${data.summary.coverageRows}`,
        `- Status counts: ${Object.entries(statusCounts).map(([status, count]) => `\`${status}\` ${count}`).join(', ')}`, '',
        '| ID | Path | Component | State | Gate | Status |',
        '|---|---|---|---|---|---|',
    ];
    for (const row of data.rows) {
        const gate = [...(row.gate.roles || []), ...(row.gate.modules || [])].join(', ') || (row.gate.authenticated ? 'authenticated' : 'public/unknown');
        lines.push(`| ${row.id} | \`${row.path}\` | ${row.component || 'unresolved'} | ${row.state.name} | ${gate} | ${row.coverage.status} |`);
    }
    return `${lines.join('\n')}\n`;
}

function slug(value) { return value.replace(/^\//, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'root'; }
function runGitHead() {
    try { return require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); }
    catch { return 'unknown'; }
}

function componentInventory() {
    const componentRoot = path.join(root, 'src/components');
    const files = walk(componentRoot).filter((file) => /\.(js|jsx|ts|tsx)$/.test(file) && !/\.(test|spec)\./.test(file));
    return {
        generatedAt: new Date().toISOString(),
        sourceRevision: runGitHead(),
        scope: 'All component source files. Runtime reachability and descendant relationships require browser verification.',
        files: files.map((file) => {
            const content = fs.readFileSync(file, 'utf8');
            const sourcePath = path.relative(root, file).replace(/\\/g, '/');
            return {
                source: sourcePath,
                surfaces: {
                    forms: matches(content, /<form\b|Form\.|<Form\b/),
                    tables: matches(content, /<table\b|\bTable\b|DataTable/),
                    modals: matches(content, /\bModal\b|\bDialog\b/),
                    drawers: matches(content, /\bDrawer\b|drawer/i),
                    dropdowns: matches(content, /\bDropdown\b|<select\b|\bSelect\b/),
                    tabs: matches(content, /\bTabs\b|\bTab\b|activeTab|activeKey/),
                    loading: matches(content, /loading|spinner|skeleton/i),
                    empty: matches(content, /empty state|no (data|records|items|results)/i),
                    error: matches(content, /error|catch\s*\(/i),
                },
                dynamicRegistration: /Registry|DefaultComponents|TasksContainer/.test(path.basename(file)),
                coverage: previousComponents.get(sourcePath)?.coverage || coverage(),
            };
        }),
    };
}

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(target) : [target];
    });
}
