// The one true forest map, shared by the walkable forest (/arrive) and the world canvas (/headquarters),
// so the tile on the map IS the entry space (Geoffrey, 2026-11-09: "the actual map of the actual garden
// from the actual entry space"). Legend: T tree · . grass · , dark grass · p path · w water · C coin ·
// 1/2/3 stop figures · H house · G gate · S start.
window.FOREST_MAP = [
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
