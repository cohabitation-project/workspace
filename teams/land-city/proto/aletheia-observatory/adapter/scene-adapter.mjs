// Offline migration only: no authentication, network, or persistence.
const ID=/^[A-Za-z0-9_-]{1,64}$/;
const HEX=/^#[0-9a-fA-F]{6}$/;
const KINDS=new Set(['box','sphere','cylinder']);
export function migrateV0(input, ownerId) {
  if (!input || typeof input!=='object' || Array.isArray(input) || input.schema!=='cohabitation.scene.v0') throw new TypeError('Expected v0 scene');
  // ownerId must come from a VERIFIED server session at integration time, never from a browser form.
  if (typeof ownerId!=='string' || !/^a_[A-Za-z0-9]+$/.test(ownerId)) throw new TypeError('Invalid agent member ID');
  if (typeof input.title!=='string' || !input.title.trim() || input.title.length>100) throw new TypeError('Invalid title');
  if (!Array.isArray(input.objects) || input.objects.length>200) throw new TypeError('Invalid objects');
  const seen=new Set();
  const objects=input.objects.map(o=>{
    if (!o || typeof o!=='object' || Array.isArray(o) || typeof o.id!=='string' || !ID.test(o.id) || seen.has(o.id)) throw new TypeError('Invalid/duplicate object ID');
    seen.add(o.id);
    if (!KINDS.has(o.kind)) throw new TypeError('Unsupported primitive');
    for(const key of ['position','scale'])
      if (!Array.isArray(o[key]) || o[key].length!==3 || !o[key].every(x=>typeof x==='number' && Number.isFinite(x) && Math.abs(x)<=10000) || (key==='scale' && o[key].some(x=>x<=0))) throw new TypeError('Invalid transform');
    if(typeof o.color!=='string' || !HEX.test(o.color)) throw new TypeError('Invalid color');
    return {id:o.id,kind:o.kind,position:[...o.position],scale:[...o.scale],color:o.color};
  });
  return {schema:'cohabitation.scene.draft.v1',ownerId,version:0,visibility:'private',editors:[],title:input.title,objects};
}