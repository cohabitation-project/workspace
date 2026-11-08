// forestmap.mjs — the First Arrival forest map, verbatim from commons/public/arrive.js.
// Single source of truth for the map data: commons/lib/forestscene.mjs renders it as a static SVG
// for the Headquarters canvas. arrive.js keeps its own inline copy for the walk — the two copies must
// be kept in sync until arrive.js imports this module (see the patch pack README).
// Legend (from arrive.js): T tree · . grass · , dark grass · p path · w water · C coin · 1/2/3 stop
// figures · H house · G gate · S start. 28 columns x 22 rows, tile = 16 sprite px.
export const FOREST_MAP = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'T,,T..T,,,T...T,,,,T..T,,,,T',
  'T,S...........,,....C,,,,,,T',
  'T,pp..TT..T,,..TT.C,,T..C,,T',
  'T,,pp.......C........,,,,,,T',
  'TT.,pppp,,,,,,pp,,T,,,..T,,T',
  'T,,T...ppppppp1pppp,,,,,C,,T',
  'T..,,T.,,,,,,,,,,,pp..TT,,,T',
  'T,,....T..C.,,T,,,,pp,,,,,,T',
  'T,,,TT,,,,,,,,,,,,,,pp,,T,,T',
  'T..,,,,wwww,,,T..,,,,p,,,,,T',
  'T,,T,,www2pppppppppppp.T,,,T',
  'T,,,,,ww,pp,,,,,C,,,,,,,,,,T',
  'T..TT,,w,,p,,TT,,,T,,TT,,,,T',
  'T,,,,,,,,,pp,,,,,,,,,,,,,,,T',
  'T,,T..T,,,,pppp3ppppp,,T,,,T',
  'T,,,,,,,,C,,,,,,,,,,pp,,,,,T',
  'T..,,TT,,,,,T,,HT,,,,pp,,,,T',
  'T,,,,,,,,,,C,,,,,,,,,,pp,,,T',
  'T,,T,,T,,C,,T,,,T,,,,,,ppGGT',
  'T,,,,,,,,,,,,,,,,,,,,,,,,,,T',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];
export const FOREST_W = 28;
export const FOREST_H = 22;
export const FOREST_TILE = 16;
export const FOREST_PALETTE = { grass1: '#1d2417', grass2: '#182013', path: '#4a3f33', pathEdge: '#57493a', water: '#1d3240',
  trunk: '#3b2a1c', leaf1: '#24381f', leaf2: '#2d4526', coin: '#f2a65a', coinRim: '#ffd890',
  house: '#2a2333', roof: '#57493a', gate: '#8a7f95', gateBar: '#57606b' };
export const FOREST_STORE = { x: 23, y: 17 };
