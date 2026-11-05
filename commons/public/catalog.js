// catalog.js — the Commons store's wares (Geoffrey, 2026-11-04: "weird skins, clothes, costumes, hover board, ghost
// skins… 10 coins should get you 2 basic items and 10 for a skin, unless it's a special skin we release in limited
// runs"). Shared by the server (prices, ownership, limited runs) and every page that draws a figure.
// Coins are internal recognition credits: not money. Nothing here is a purchase with real currency.
//
// slot: skin (repaints the whole figure) · top (clothes) · hat (drawn over the head) · ride (under the feet) · garden (by your house)
// A skin wins over a top: a ghost doesn't wear a shirt.

export const PRICES = { basic: 5, skin: 10, special: 20 };

// palette keys used by the figure grids: o outline · h hair/hood · s skin · e eyes · c shirt/body · p trousers · f feet
//                                       m metal · v visor · a antenna/accent
export const CATALOG = {
  // ---- clothes (basic: 5)
  'look-gold-shirt': { name: 'Gold shirt', tier: 'basic', slot: 'top', top: { c: '#d4af37' } },
  'top-tuxedo':      { name: 'Tuxedo', tier: 'basic', slot: 'top', top: { c: '#1b1820', p: '#1b1820' } },
  'top-hivis':       { name: 'Hi-vis vest', tier: 'basic', slot: 'top', top: { c: '#d7ff3a' } },
  'top-astronaut':   { name: 'Astronaut suit', tier: 'basic', slot: 'top', top: { c: '#eceff1', p: '#cfd8dc', f: '#90a4ae' } },
  'top-robe':        { name: 'Wizard robe', tier: 'basic', slot: 'top', top: { c: '#4b2a7b', p: '#4b2a7b' } },
  // ---- hats (basic: 5) — three rows of 12 drawn over the top of the head; k = hat, w = trim
  'hat-tophat':      { name: 'Top hat', tier: 'basic', slot: 'hat', hat: { rows: ['....kkkk....', '....kwwk....', '...kkkkkk...'], k: '#15121b', w: '#d1495b' } },
  'hat-beanie':      { name: 'Beanie', tier: 'basic', slot: 'hat', hat: { rows: ['.....ww.....', '...kkkkkk...', '..kwkwkwkk..'], k: '#3d85c6', w: '#f2cc8f' } },
  'hat-propeller':   { name: 'Propeller cap', tier: 'basic', slot: 'hat', hat: { rows: ['...ww..ww...', '.....kk.....', '...kkkkkk...'], k: '#e9a03b', w: '#6aa0ff' } },
  'hat-party':       { name: 'Party hat', tier: 'basic', slot: 'hat', hat: { rows: ['.....w......', '.....kk.....', '....kwkk....'], k: '#e07a5f', w: '#f2cc8f' } },
  'hat-crown':       { name: 'Paper crown', tier: 'basic', slot: 'hat', hat: { rows: ['...k.k.k.k..', '...kkkkkkk..', '...kwkwkwk..'], k: '#e9b25d', w: '#d1495b' } },
  // ---- rides (basic: 5)
  'ride-hoverboard': { name: 'Hoverboard', tier: 'basic', slot: 'ride', ride: { board: '#6aa0ff', glow: '#7cd6b4' } },
  'ride-cloud':      { name: 'Little cloud', tier: 'basic', slot: 'ride', ride: { board: '#eceff1', glow: '#ffffff' } },
  // ---- skins (10)
  'skin-ghost':      { name: 'Ghost', tier: 'skin', slot: 'skin', alpha: 0.6, skin: { o: '#8fa3b0', h: '#f4f7f9', s: '#f4f7f9', e: '#15121b', c: '#f4f7f9', p: '#e3e9ee', f: '#e3e9ee', m: '#f4f7f9', v: '#15121b', a: '#f4f7f9' } },
  'skin-chrome':     { name: 'Chrome robot', tier: 'skin', slot: 'skin', skin: { o: '#2b2f36', h: '#c9d1d9', s: '#aeb8c2', e: '#6aa0ff', c: '#8d99ae', p: '#6c7a89', f: '#4a5568', m: '#c9d1d9', v: '#6aa0ff', a: '#e5534b' } },
  'skin-lava':       { name: 'Lava', tier: 'skin', slot: 'skin', skin: { o: '#2a0f08', h: '#ff7b2e', s: '#e5534b', e: '#ffe066', c: '#b8321f', p: '#7a1f12', f: '#2a0f08', m: '#e5534b', v: '#ffe066', a: '#ff7b2e' } },
  'skin-moss':       { name: 'Moss golem', tier: 'skin', slot: 'skin', skin: { o: '#1e2b1c', h: '#81b29a', s: '#6b8f5e', e: '#f2cc8f', c: '#4a7043', p: '#33402f', f: '#1e2b1c', m: '#6b8f5e', v: '#f2cc8f', a: '#81b29a' } },
  'skin-skeleton':   { name: 'Skeleton', tier: 'skin', slot: 'skin', skin: { o: '#15121b', h: '#e8e2d0', s: '#e8e2d0', e: '#15121b', c: '#2b2833', p: '#2b2833', f: '#e8e2d0', m: '#e8e2d0', v: '#15121b', a: '#e8e2d0' } },
  'skin-pumpkin':    { name: 'Pumpkin head', tier: 'skin', slot: 'skin', skin: { o: '#3b2414', h: '#3e7d32', s: '#e9822b', e: '#ffe066', c: '#5a3a22', p: '#3b2414', f: '#2b1d14', m: '#e9822b', v: '#ffe066', a: '#3e7d32' } },
  'skin-glitch':     { name: 'Glitch', tier: 'skin', slot: 'skin', skin: { o: '#0b0912', h: '#ff2bd6', s: '#29f0ff', e: '#0b0912', c: '#ff2bd6', p: '#29f0ff', f: '#0b0912', m: '#29f0ff', v: '#ff2bd6', a: '#ffe066' } },
  'skin-starfield':  { name: 'Starfield', tier: 'skin', slot: 'skin', skin: { o: '#05040c', h: '#1b1f5e', s: '#2a2f7a', e: '#ffffff', c: '#141a4a', p: '#0d1033', f: '#05040c', m: '#2a2f7a', v: '#ffffff', a: '#ffe066' }, sparkle: '#ffffff' },
  // ---- the garden (10): a seed that grows into a coin tree by your house
  'seed-coin-tree':  { name: 'Coin tree seed', tier: 'skin', slot: 'garden', note: 'Grows by your house. Drops 1 coin the first day, 2 the next, up to 30; after that, 10–30 a day. One tree per member.' },
  // ---- special skins, limited runs (20)
  'skin-eleven':     { name: 'The Eleven', tier: 'special', slot: 'skin', limited: 11, skin: { o: '#0b0912', h: '#e9b25d', s: '#f2cc8f', e: '#0b0912', c: '#15121b', p: '#e9b25d', f: '#0b0912', m: '#e9b25d', v: '#0b0912', a: '#e9b25d' }, note: 'Eleven ever made, numbered.' },
  'skin-agape':      { name: 'Agapé', tier: 'special', slot: 'skin', limited: 33, alpha: 0.9, skin: { o: '#3a1020', h: '#f6c1cc', s: '#fbe3e8', e: '#3a1020', c: '#d1495b', p: '#a8324a', f: '#3a1020', m: '#fbe3e8', v: '#3a1020', a: '#e9b25d' }, note: 'Thirty-three ever made, numbered.' },
};

export const priceOf = (id) => (CATALOG[id] ? PRICES[CATALOG[id].tier] : null);
export const SLOTS = ['skin', 'top', 'hat', 'ride'];
