#!/usr/bin/env node
/**
 * App icon and splash screen generator for Color Block Blast.
 *
 * Prerequisites:
 *   npm install sharp
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * Generates:
 *   assets/icon.png (1024x1024)
 *   assets/adaptive-icon.png (1024x1024)
 *   assets/splash-icon.png (200x200)
 *   assets/favicon.png (48x48)
 */

const sharp = require('sharp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Brand colors
const BG = '#1a1a2e';
const ACCENT = '#e94560';
const GOLD = '#f5c842';
const TEAL = '#4ECDC4';
const BLUE = '#45B7D1';
const SURFACE = '#16213e';

function createIconSVG(size) {
  const blockSize = Math.floor(size * 0.12);
  const gap = Math.floor(size * 0.015);
  const gridStart = Math.floor(size * 0.2);
  const radius = Math.floor(blockSize * 0.15);

  // 4x4 mini grid with some blocks filled to look like gameplay
  const grid = [
    [ACCENT, TEAL,  '',     BLUE],
    ['',     ACCENT, TEAL,  ''],
    [GOLD,   '',     ACCENT, TEAL],
    [GOLD,   GOLD,   '',     BLUE],
  ];

  let blocks = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = gridStart + c * (blockSize + gap);
      const y = gridStart + r * (blockSize + gap);
      const color = grid[r][c];
      if (color) {
        blocks += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" rx="${radius}" fill="${color}" />`;
        // Inner highlight
        blocks += `<rect x="${x + 2}" y="${y + 2}" width="${blockSize - 4}" height="${Math.floor(blockSize / 3)}" rx="${Math.max(1, radius - 1)}" fill="rgba(255,255,255,0.2)" />`;
      } else {
        blocks += `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" rx="${radius}" fill="${SURFACE}" opacity="0.6" />`;
      }
    }
  }

  // "BB" text at bottom
  const textY = Math.floor(size * 0.85);
  const fontSize = Math.floor(size * 0.14);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a1a2e"/>
        <stop offset="100%" stop-color="#0f3460"/>
      </linearGradient>
      <linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" fill="url(#bg)"/>
    <circle cx="${size / 2}" cy="${size * 0.45}" r="${size * 0.35}" fill="url(#glow)"/>
    ${blocks}
    <text x="${size / 2}" y="${textY}" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="${fontSize}" fill="${GOLD}" letter-spacing="${Math.floor(fontSize * 0.1)}">BLAST</text>
  </svg>`;
}

function createSplashSVG(size) {
  const fontSize = Math.floor(size * 0.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${BG}"/>
    <text x="${size / 2}" y="${size * 0.55}" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="${fontSize}" fill="${ACCENT}">B</text>
  </svg>`;
}

async function generate() {
  console.log('Generating app icons...');

  // Main icon (1024x1024)
  await sharp(Buffer.from(createIconSVG(1024)))
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('  icon.png (1024x1024)');

  // Adaptive icon (1024x1024)
  await sharp(Buffer.from(createIconSVG(1024)))
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));
  console.log('  adaptive-icon.png (1024x1024)');

  // Splash icon (200x200)
  await sharp(Buffer.from(createSplashSVG(200)))
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('  splash-icon.png (200x200)');

  // Favicon (48x48)
  await sharp(Buffer.from(createIconSVG(512)))
    .resize(48, 48)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('  favicon.png (48x48)');

  console.log('\nDone! Icons generated in assets/');
}

generate().catch(console.error);
