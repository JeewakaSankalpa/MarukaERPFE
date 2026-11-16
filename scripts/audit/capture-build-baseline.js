const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const buildDir = path.join(root, 'build/static');
if (!fs.existsSync(buildDir)) throw new Error('build/static does not exist. Run npm run build first.');

const assets = [];
for (const type of ['js', 'css']) {
    const directory = path.join(buildDir, type);
    for (const name of fs.readdirSync(directory).filter((file) => !file.endsWith('.map') && !file.endsWith('.LICENSE.txt'))) {
        const bytes = fs.readFileSync(path.join(directory, name));
        assets.push({ type, name, bytes: bytes.length, gzipBytes: zlib.gzipSync(bytes).length, asyncChunk: name.includes('.chunk.') });
    }
}

const totals = (type) => {
    const selected = assets.filter((asset) => asset.type === type);
    return {
        files: selected.length,
        bytes: selected.reduce((sum, asset) => sum + asset.bytes, 0),
        gzipBytes: selected.reduce((sum, asset) => sum + asset.gzipBytes, 0),
        asyncChunks: selected.filter((asset) => asset.asyncChunk).length,
    };
};

const baseline = {
    capturedAt: new Date().toISOString(),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    node: process.version,
    notes: [
        'Build completed with existing ESLint warnings.',
        'The main bundle is eager-loaded; async chunks originate from project-detail component boundaries.',
        'This file contains asset measurements only and no environment URLs or credentials.',
    ],
    totals: { javascript: totals('js'), css: totals('css') },
    assets: assets.sort((a, b) => b.bytes - a.bytes),
};

const output = path.join(root, 'docs/audit/build-baseline.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(JSON.stringify(baseline.totals, null, 2));
