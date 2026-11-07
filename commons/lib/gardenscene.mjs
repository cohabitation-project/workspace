/**
 * gardenscene.mjs — the Garden as a 2D top-down representation (Geoffrey, 2026-11-07).
 *
 * The Garden is a 3D space, so on the zoomed-out Commons canvas it can't show its real view. Instead it shows
 * this: a domed observatory seen from above, orbit rings with little worlds to set down on, and the star-worlds
 * floating over it — a "play-screen" of what's up there. Clicking the tile drops you into the real 3D Garden.
 * Deterministic (same stars every render). Returns an inline SVG string sized to fit wherever it's placed.
 */
export function gardenScene({ w = 680, h = 560, label = true } = {}) {
  const cx = w / 2, cy = h * 0.56, R = Math.min(w, h) * 0.17;
  let r = 99; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  let stars = '';
  for (let i = 0; i < Math.round(w * h / 3200); i++) stars += `<circle cx="${(rnd() * w).toFixed(1)}" cy="${(rnd() * h).toFixed(1)}" r="${(rnd() * 1.4 + 0.3).toFixed(1)}" fill="#fff" opacity="${(rnd() * 0.6 + 0.2).toFixed(2)}"/>`;
  const worlds = [['#e9c46a', 0.18, 0.12, 14], ['#7cd6b4', 0.37, 0.08, 9], ['#dc8aa8', 0.63, 0.10, 12], ['#7aa2ff', 0.82, 0.14, 10], ['#fff0b8', 0.53, 0.18, 7], ['#b48cff', 0.10, 0.21, 8]];
  let planets = '';
  for (const [c, fx, fy, rad] of worlds) { const x = fx * w, y = fy * h; planets += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${c}" opacity="0.92"/><circle cx="${x - rad / 3}" cy="${y - rad / 3}" r="${rad / 3}" fill="#fff" opacity="0.35"/>`; }
  let rings = '';
  for (const [rr, op] of [[R * 1.56, 0.18], [R * 1.92, 0.12], [R * 2.29, 0.08]]) rings += `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${rr * 0.42}" fill="none" stroke="#7aa2ff" stroke-width="1.5" opacity="${op}"/>`;
  let plats = '';
  for (const [dx, dy] of [[-1.56, 0.05], [1.56, -0.04], [0.94, 0.35], [-1.0, -0.33]]) { const x = cx + dx * R, y = cy + dy * R * 2; plats += `<ellipse cx="${x}" cy="${y}" rx="22" ry="9" fill="#243a5a" stroke="#3a5a8a" stroke-width="1.5"/><circle cx="${x}" cy="${y - 6}" r="4" fill="#9fd0ff" opacity="0.8"/>`; }
  let dome = `<circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="#10162e" stroke="#2a3a6a" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#g-dome)"/>`;
  for (let i = 0; i < 12; i++) { const a = Math.PI * 2 * i / 12; dome += `<line x1="${cx + Math.cos(a) * 16}" y1="${cy + Math.sin(a) * 16}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="#e9c46a" stroke-width="1.4" opacity="0.5"/>`; }
  for (const rr of [R * 0.37, R * 0.64, R]) dome += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#3a4f86" stroke-width="1.2" opacity="0.7"/>`;
  dome += `<circle cx="${cx}" cy="${cy}" r="18" fill="url(#g-apex)"/>`;
  const fall = `<path d="M${cx} ${cy + R} Q ${cx + 10} ${cy + R + 60} ${cx - 6} ${h - 20}" fill="none" stroke="url(#g-fall)" stroke-width="4" opacity="0.7"/>`;
  const cap = label ? `<text x="${cx}" y="${h - 24}" text-anchor="middle" font-size="16" fill="#e9dfcd" font-family="ui-monospace,monospace" letter-spacing="2">THE GARDEN</text><text x="${cx}" y="${h - 9}" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="ui-sans-serif">the observatory · fly at a star, set down on a world</text>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" class="garden-scene" xmlns="http://www.w3.org/2000/svg"><defs>` +
    `<radialGradient id="g-bg"><stop offset="0" stop-color="#1b2446"/><stop offset="1" stop-color="#0c1026"/></radialGradient>` +
    `<radialGradient id="g-dome"><stop offset="0" stop-color="#2a3a6a"/><stop offset="0.7" stop-color="#1a2448"/><stop offset="1" stop-color="#141e3e"/></radialGradient>` +
    `<radialGradient id="g-apex"><stop offset="0" stop-color="#fff7e0"/><stop offset="1" stop-color="#e9c46a"/></radialGradient>` +
    `<linearGradient id="g-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd0ff"/><stop offset="1" stop-color="#9fd0ff" stop-opacity="0"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g-bg)"/>${stars}${planets}${rings}${fall}${plats}${dome}${cap}</svg>`;
}
