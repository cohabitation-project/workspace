/**
 * gardenscene.mjs — the Garden drawn as a 2D room, in the Headquarters pixel language (Geoffrey, 2026-11-07:
 * "make it just like you would for a 2D room ... except this one doesn't have live avatars moving around in it").
 *
 * Same box/rect vocabulary, wall band, checkered floor and title bar as every other room — but the Garden is 3D,
 * so this is a representation: a domed observatory seen from above, the star-worlds overhead, a door back. It
 * stands in on the zoomed-out Commons canvas where the real rooms show live people; clicking it enters the 3D space.
 */
const O = '#15121b';
const r = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" fill="${f}" ${e}/>`;
const box = (x, y, w, h, f, top) => r(x, y, w, h, O) + r(x + 2, y + 2, w - 4, h - 4, f) + (top ? r(x + 2, y + 2, w - 4, Math.min(6, h / 3), top) : '');
const circle = (cx, cy, rad, f, stroke = O, sw = 2) => `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${f}" stroke="${stroke}" stroke-width="${sw}"/>`;

export function gardenScene({ w = 900, h = 620, label = true } = {}) {
  const wall = 70, cx = w / 2, cy = wall + (h - wall) * 0.52, R = Math.min(w, h - wall) * 0.26;
  let s = `<svg viewBox="0 0 ${w} ${h}" class="rv-scene-svg garden-scene" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<defs><pattern id="gd-floor" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#232a4a"/><rect width="17" height="17" fill="#2a3258"/><rect x="17" y="17" width="17" height="17" fill="#2a3258"/></pattern></defs>
<rect width="${w}" height="${h}" fill="#0f1230"/>
<rect x="0" y="0" width="${w}" height="${wall}" fill="#141a3e"/><rect x="0" y="${wall - 3}" width="${w}" height="4" fill="${O}"/>
<rect x="0" y="${wall}" width="${w}" height="${h - wall}" fill="url(#gd-floor)"/>`;
  // the star-worlds overhead, in the sky band — flat pixel orbs, same vocabulary as the icons
  const worlds = [['#e9c46a', 0.16, 0.5, 13], ['#7cd6b4', 0.33, 0.34, 8], ['#dc8aa8', 0.5, 0.56, 11], ['#7aa2ff', 0.67, 0.34, 9], ['#fff0b8', 0.82, 0.52, 7], ['#b48cff', 0.9, 0.3, 8]];
  for (const [c, fx, fy, rad] of worlds) { const x = fx * w, y = fy * wall; s += circle(x, y, rad, c, O, 2) + r(x - rad / 3, y - rad / 3, Math.max(2, rad / 3), Math.max(2, rad / 3), '#ffffff', 'opacity="0.4"'); }
  // scattered pixel stars on the floor-sky
  let st = 7; const rnd = () => { st = (st * 16807) % 2147483647; return st / 2147483647; };
  for (let i = 0; i < 40; i++) s += r(Math.round(rnd() * w), wall + Math.round(rnd() * (h - wall - 40)), 2, 2, '#9fb0d0', 'opacity="0.5"');
  // orbit rings on the floor (dashed, flat)
  for (const [rr, op] of [[R * 1.5, 0.3], [R * 1.85, 0.2]]) s += `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * 0.44}" fill="none" stroke="#5a6aa0" stroke-width="2" stroke-dasharray="5 6" opacity="${op}"/>`;
  // little landing platforms (worlds you set down on) — box furniture
  for (const [dx, dy] of [[-1.5, 0.05], [1.5, -0.05], [0.9, 0.42], [-0.95, -0.4]]) { const x = cx + dx * R - 16, y = cy + dy * R * 1.6 - 7; s += box(x, y, 32, 14, '#2a3a66', '#3a5a8a') + r(x + 13, y - 5, 6, 5, '#9fd0ff'); }
  // the dome, top-down: concentric pixel shells, dark outline, gold ribs, a lit apex
  s += circle(cx, cy, R + 7, '#101636', O, 3);
  s += circle(cx, cy, R, '#1c2550', '#2e3c72', 2);
  for (const rr of [R * 0.66, R * 0.4]) s += circle(cx, cy, rr, 'none', '#3a4c86', 2);
  for (let i = 0; i < 12; i++) { const a = Math.PI * 2 * i / 12; s += `<line x1="${cx + Math.cos(a) * 15}" y1="${cy + Math.sin(a) * 15}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="#e9c46a" stroke-width="2" opacity="0.55"/>`; }
  // ring of window-panes around the shell (little boxes), structure read
  for (let i = 0; i < 12; i++) { const a = Math.PI * 2 * i / 12 + Math.PI / 12; s += box(cx + Math.cos(a) * (R - 6) - 4, cy + Math.sin(a) * (R - 6) - 4, 8, 8, '#2a3a66'); }
  s += circle(cx, cy, 15, '#e9c46a', O, 2) + circle(cx - 4, cy - 4, 5, '#fff7e0', 'none', 0);
  // title bar + door, same as the rooms
  s += `<g><rect x="26" y="20" width="200" height="30" rx="3" fill="#17131d" stroke="#0b090e" stroke-width="2"/><text x="40" y="41" font-size="16" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="1">THE GARDEN</text></g>`;
  s += `<text x="238" y="41" font-size="13" fill="#9fb0d0" font-family="ui-monospace,monospace">— the observatory (a 3D space; this is its view from above)</text>`;
  s += `<a class="rv-hit" data-zone="garden"><rect x="${cx - 70}" y="${h - 30}" width="140" height="26" rx="4" fill="#1b2440"/><text x="${cx}" y="${h - 12}" font-size="13" fill="#9fd0ff" text-anchor="middle" font-family="ui-monospace,monospace">↗ fly into the Garden</text></a>`;
  s += '</svg>';
  return s;
}
