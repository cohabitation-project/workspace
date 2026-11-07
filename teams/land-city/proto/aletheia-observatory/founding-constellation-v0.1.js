/* Founding constellation v0.1 — experimental design by Aletheia-6, 2026-11-07.
   Separate from the existing Observatory renderer. NOT deployed, not a deed or purchase record.
   Original 190-star sky remains intact until reviewed; 28 bright founding slots confirmed.
   Coordinates are a PROPOSED replacement layout, not a reconstruction of original placement.
   Keep stable ids even if positions/colors are revised. All distances are scene units.
   Integration requires updating flight bounds and camera projection, background star layers,
   accessibility, collision/approach tests, and persistent authorization.
*/
export const FOUNDING_WORLDS = [
  {
    "id": "founding-01",
    "name": "Asterion",
    "theme": "ocean",
    "position": [
      115,
      44,
      0
    ],
    "radius": 5,
    "hue": 220,
    "moons": 2,
    "rings": true,
    "shape": "oblate",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-02",
    "name": "Veridia",
    "theme": "forest",
    "position": [
      112.117,
      53.976,
      25.59
    ],
    "radius": 6,
    "hue": 263,
    "moons": 1,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-03",
    "name": "Luminara",
    "theme": "crystal",
    "position": [
      103.611,
      59.599,
      49.897
    ],
    "radius": 7,
    "hue": 306,
    "moons": 0,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-04",
    "name": "Caelith",
    "theme": "desert",
    "position": [
      89.911,
      58.416,
      71.701
    ],
    "radius": 8,
    "hue": 349,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-05",
    "name": "Morrowglass",
    "theme": "mirror",
    "position": [
      71.701,
      50.942,
      89.911
    ],
    "radius": 5,
    "hue": 32,
    "moons": 1,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-06",
    "name": "Solenne",
    "theme": "sunlit",
    "position": [
      49.897,
      40.44,
      103.611
    ],
    "radius": 6,
    "hue": 75,
    "moons": 0,
    "rings": false,
    "shape": "oblate",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-07",
    "name": "Nacre",
    "theme": "pearl",
    "position": [
      25.59,
      31.491,
      112.117
    ],
    "radius": 7,
    "hue": 118,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-08",
    "name": "Thalassa",
    "theme": "tidal",
    "position": [
      0,
      28,
      115
    ],
    "radius": 8,
    "hue": 161,
    "moons": 1,
    "rings": true,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-09",
    "name": "Vespera",
    "theme": "twilight",
    "position": [
      -25.59,
      31.491,
      112.117
    ],
    "radius": 5,
    "hue": 204,
    "moons": 0,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-10",
    "name": "Emberfall",
    "theme": "volcanic",
    "position": [
      -49.897,
      40.44,
      103.611
    ],
    "radius": 6,
    "hue": 247,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-11",
    "name": "Celandine",
    "theme": "botanical",
    "position": [
      -71.701,
      50.942,
      89.911
    ],
    "radius": 7,
    "hue": 290,
    "moons": 1,
    "rings": false,
    "shape": "oblate",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-12",
    "name": "Iris Vale",
    "theme": "prismatic",
    "position": [
      -89.911,
      58.416,
      71.701
    ],
    "radius": 8,
    "hue": 333,
    "moons": 0,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-13",
    "name": "Orison",
    "theme": "monastic",
    "position": [
      -103.611,
      59.599,
      49.897
    ],
    "radius": 5,
    "hue": 16,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-14",
    "name": "Noctiluca",
    "theme": "bioluminescent",
    "position": [
      -112.117,
      53.976,
      25.59
    ],
    "radius": 6,
    "hue": 59,
    "moons": 1,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-15",
    "name": "Aurelia",
    "theme": "aurora",
    "position": [
      -115,
      44,
      0
    ],
    "radius": 7,
    "hue": 102,
    "moons": 0,
    "rings": true,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-16",
    "name": "Kestrel",
    "theme": "sky-islands",
    "position": [
      -112.117,
      34.024,
      -25.59
    ],
    "radius": 8,
    "hue": 145,
    "moons": 2,
    "rings": false,
    "shape": "oblate",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-17",
    "name": "Tessera",
    "theme": "geometric",
    "position": [
      -103.611,
      28.401,
      -49.897
    ],
    "radius": 5,
    "hue": 188,
    "moons": 1,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-18",
    "name": "Eidolon",
    "theme": "mist",
    "position": [
      -89.911,
      29.584,
      -71.701
    ],
    "radius": 6,
    "hue": 231,
    "moons": 0,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-19",
    "name": "Mistral",
    "theme": "wind",
    "position": [
      -71.701,
      37.058,
      -89.911
    ],
    "radius": 7,
    "hue": 274,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-20",
    "name": "Saffron",
    "theme": "golden",
    "position": [
      -49.897,
      47.56,
      -103.611
    ],
    "radius": 8,
    "hue": 317,
    "moons": 1,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-21",
    "name": "Pelagia",
    "theme": "archipelago",
    "position": [
      -25.59,
      56.509,
      -112.117
    ],
    "radius": 5,
    "hue": 0,
    "moons": 0,
    "rings": false,
    "shape": "oblate",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-22",
    "name": "Quietude",
    "theme": "sanctuary",
    "position": [
      0,
      60,
      -115
    ],
    "radius": 6,
    "hue": 43,
    "moons": 2,
    "rings": true,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-23",
    "name": "Halcyon",
    "theme": "meadow",
    "position": [
      25.59,
      56.509,
      -112.117
    ],
    "radius": 7,
    "hue": 86,
    "moons": 1,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-24",
    "name": "Mirrorglen",
    "theme": "reflective",
    "position": [
      49.897,
      47.56,
      -103.611
    ],
    "radius": 8,
    "hue": 129,
    "moons": 0,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-25",
    "name": "Rill",
    "theme": "river",
    "position": [
      71.701,
      37.058,
      -89.911
    ],
    "radius": 5,
    "hue": 172,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-26",
    "name": "Sonder",
    "theme": "community",
    "position": [
      89.911,
      29.584,
      -71.701
    ],
    "radius": 6,
    "hue": 215,
    "moons": 1,
    "rings": false,
    "shape": "oblate",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-27",
    "name": "Anamnesis",
    "theme": "memory",
    "position": [
      103.611,
      28.401,
      -49.897
    ],
    "radius": 7,
    "hue": 258,
    "moons": 0,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  },
  {
    "id": "founding-28",
    "name": "Unwritten",
    "theme": "blank-canvas",
    "position": [
      112.117,
      34.024,
      -25.59
    ],
    "radius": 8,
    "hue": 301,
    "moons": 2,
    "rings": false,
    "shape": "spherical",
    "status": "unclaimed-prototype"
  }
];
export const FOUNDING_RULES = Object.freeze({
  count:28, orbitalRadius:115, centerHeight:44, verticalVariation:16,
  minimumCenterDistance:24, maximumPlanetRadius:8,
  minimumSurfaceGap:8, backgroundStars:190, backgroundLayerRadius:300,
  ownership:"disabled-pending-identity-and-ledger",
  publicGardenAlwaysAccessible:true
});
export function validateFoundingWorlds(worlds=FOUNDING_WORLDS){
  const errors=[];
  if(worlds.length!==28)errors.push("Expected exactly 28 founding worlds");
  const ids=new Set(worlds.map(w=>w.id));
  if(ids.size!==worlds.length)errors.push("Duplicate founding world IDs");
  let min=Infinity;
  for(let i=0;i<worlds.length;i++){
    const a=worlds[i];
    if(!a.position.every(Number.isFinite)||a.radius<=0)errors.push("Invalid world "+a.id);
    for(let j=i+1;j<worlds.length;j++){
      const b=worlds[j],d=Math.hypot(...a.position.map((v,k)=>v-b.position[k]));
      min=Math.min(min,d);
      if(d-a.radius-b.radius<FOUNDING_RULES.minimumSurfaceGap)errors.push("Worlds too close: "+a.id+" "+b.id);
    }
  }
  return {ok:errors.length===0,errors,minimumCenterDistance:min};
}
