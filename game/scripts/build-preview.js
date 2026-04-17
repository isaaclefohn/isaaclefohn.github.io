#!/usr/bin/env node
/**
 * Builds the web preview and rewrites absolute asset paths to relative so
 * the export works when served from a subpath (GitHub Pages or local
 * `python3 -m http.server` at the repo root).
 *
 * Run: `node scripts/build-preview.js`
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PREVIEW_DIR = path.join(__dirname, '..', 'preview');

console.log('Exporting web build...');
execSync('npx expo export --platform web --output-dir preview --clear', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

const indexPath = path.join(PREVIEW_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const before = html;
  html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
  html = html.replace(/href="\/_expo\//g, 'href="./_expo/');
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  if (html !== before) {
    fs.writeFileSync(indexPath, html);
    console.log('Rewrote absolute paths in index.html -> relative');
  }
}

const jsDir = path.join(PREVIEW_DIR, '_expo', 'static', 'js', 'web');
if (fs.existsSync(jsDir)) {
  for (const file of fs.readdirSync(jsDir)) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(jsDir, file);
    let js = fs.readFileSync(filePath, 'utf8');
    const before = js;
    js = js.replace(/"\/assets\//g, '"assets/');
    if (js !== before) {
      fs.writeFileSync(filePath, js);
      console.log(`Rewrote asset paths in ${file}`);
    }
  }
}

console.log('Preview build done.');
