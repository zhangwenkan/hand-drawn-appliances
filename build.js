#!/usr/bin/env node
/*
 * build.js — regenerate the deployable site from the dev sources.
 *
 *   node build.js
 *
 * Produces:
 *   dist/index.html          the shell page (byte-identical to what is deployed)
 *   dist/figures/<id>.html   each current-generation figure, fully inlined
 *                            (exactly the string the shell injects via iframe srcdoc)
 *   dev/<id>.html            dev-mode figure pages that load core + figure
 *                            as separate <script src> files, the way the core's
 *                            header comment describes
 *
 * No dependencies. Run with any Node >= 14.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---- template (preserve the original BOM if the template has one)
const tplBuf = fs.readFileSync(path.join(ROOT, 'index.template.html'));
const HAS_BOM = tplBuf[0] === 0xef && tplBuf[1] === 0xbb && tplBuf[2] === 0xbf;
const template = tplBuf.toString('utf8').replace(/^\ufeff+/, '');

const core = read('core/colorfigures.js');
const manifest = JSON.parse(read('figures.json'));

// ---- string escaping, matching the serialization of the deployed page:
//      JSON.stringify, then \uXXXX for every non-ASCII code unit, then '</' -> '<\/'
function jsStr(s) {
  return JSON.stringify(s)
    .replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
    .replace(/<\//g, '<\\/');
}

// ---- assemble the FIGS array
const figs = manifest.map(e => {
  const src = e.gen === 'current'
    ? e.head + core + e.mid + read(`figures/${e.id}.js`) + e.tail
    : read(`legacy/${e.id}.html`);
  return { id: e.id, name: e.name, src };
});

const entries = figs
  .map(f => '{' + Object.keys(f).map(k => `${JSON.stringify(k)}: ${jsStr(f[k])}`).join(', ') + '}')
  .join(', ');

const PLACEHOLDER = 'const FIGS = /* __FIGS__ */[];';
if (!template.includes(PLACEHOLDER)) throw new Error('placeholder missing in index.template.html');
const out = template.replace(PLACEHOLDER, () => `const FIGS = [${entries}];`);

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'index.html'), (HAS_BOM ? '\ufeff' : '') + out);

// ---- standalone built figure pages (what the shell inlines)
const builtDir = path.join(ROOT, 'dist', 'figures');
fs.mkdirSync(builtDir, { recursive: true });
for (const e of manifest) {
  if (e.gen !== 'current') continue;
  fs.writeFileSync(path.join(builtDir, e.id + '.html'),
    e.head + core + e.mid + read(`figures/${e.id}.js`) + e.tail);
}

// ---- dev-mode pages: core and figure stay separate files
const devDir = path.join(ROOT, 'dev');
fs.mkdirSync(devDir, { recursive: true });
for (const e of manifest) {
  if (e.gen !== 'current') continue;
  const head = e.head.replace(/<script>$/, `<script src="../core/colorfigures.js"></script>\n<script src="../figures/${e.id}.js"></script>`);
  const tail = e.tail.replace(/^<\/script>/, '');
  fs.writeFileSync(path.join(devDir, e.id + '.html'), head + tail);
}

console.log(`built dist/index.html (${out.length} chars) + ${manifest.filter(e => e.gen === 'current').length} built figure pages + dev pages`);
