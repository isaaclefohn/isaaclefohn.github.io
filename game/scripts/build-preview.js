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

  // Bust browser cache: the bundle filename is content-hashed, but the
  // outer HTML has no hash in the URL, so browsers happily serve a stale
  // HTML that points at a renamed (and now 404ing) bundle. A no-cache meta
  // forces a fresh HTML fetch on every load.
  if (!html.includes('http-equiv="Cache-Control"')) {
    html = html.replace(
      '<meta charset="utf-8" />',
      '<meta charset="utf-8" />\n    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n    <meta http-equiv="Pragma" content="no-cache" />\n    <meta http-equiv="Expires" content="0" />',
    );
  }

  // Seed the root with a dark loading background so the user sees something
  // the instant the HTML lands, before the JS bundle has parsed and rendered.
  // Also surface any runtime error so a blank page is never silent.
  if (!html.includes('id="bootSplash"')) {
    const bootFragment = `<div id="root"></div>
    <div id="bootSplash" style="position:fixed;inset:0;background:#0F0E1A;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#8B89A6;font-family:system-ui,-apple-system,sans-serif;font-size:12px;letter-spacing:4px;font-weight:700;z-index:-1;">
      <div>LOADING</div>
      <div id="bootError" style="margin-top:16px;max-width:80%;font-size:11px;letter-spacing:0;color:#FF3B5C;text-align:center;white-space:pre-wrap;"></div>
    </div>
    <script>
      window.addEventListener('error', function (e) {
        var box = document.getElementById('bootError');
        if (box) box.textContent = (e.message || 'Unknown error') + '\\n' + (e.filename || '') + ':' + (e.lineno || '');
      });
      window.addEventListener('unhandledrejection', function (e) {
        var box = document.getElementById('bootError');
        if (box) box.textContent = 'Unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason));
      });
    </script>`;
    html = html.replace('<div id="root"></div>', bootFragment);
  }

  if (html !== before) {
    fs.writeFileSync(indexPath, html);
    console.log('Patched index.html (relative paths, cache headers, boot splash)');
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
