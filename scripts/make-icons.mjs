// Renders public/icons/icon.svg to the PNG sizes iOS/Android need. Uses Playwright's Chromium.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const targets = [
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/apple-touch-icon.png', 180, 0],
  ['public/icons/icon-maskable-512.png', 512, 0.12], // safe-zone padding for maskable icons
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  // apple-touch-icon / maskable must be opaque squares (iOS rounds corners itself)
  const body = svg.replace('rx="112"', pad || file.includes('apple') ? 'rx="0"' : 'rx="112"');
  await page.setContent(
    `<html><body style="margin:0;background:${pad || file.includes('apple') ? '#0b0f14' : 'transparent'};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
     <div style="width:${inner}px;height:${inner}px">${body.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: file, omitBackground: !(pad || file.includes('apple')) });
  console.log('wrote', file);
}
await browser.close();
