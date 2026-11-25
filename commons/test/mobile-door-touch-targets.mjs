// Doors-open mobile touch-target CSS contract.
// Run: node commons/test/mobile-door-touch-targets.mjs
// Static regression only: actual browser geometry still needs independent visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/site.css'), 'utf8');
const authCss = fs.readFileSync(path.join(root, 'public/auth/auth.css'), 'utf8');

const mobile = css.match(/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\/\* Library \*\//g) || [];
const touch = mobile.find((block) => block.includes('Mobile doors-open touch targets:') || block.includes('.door .btn'));
assert.ok(touch, 'mobile door touch-target rules must exist');
assert.match(touch, /\.door \.btn,\s*\.door \.linkbtn,\s*\.copyrow \.btn\s*\{[^}]*min-height:\s*44px\s*;/, 'door and copy controls must be at least 44px tall');
assert.match(touch, /\.foot a\s*\{[^}]*min-height:\s*44px\s*;/, 'footer links must have 44px hitboxes');
assert.match(authCss, /\.cx-btn\s*\{[^}]*min-height:\s*50px\s*;/, 'auth scene already uses 50px controls');
console.log('mobile door touch-target CSS contract passed (static assertions only)');
