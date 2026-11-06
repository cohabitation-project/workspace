// Pure policy prototype, NOT an authenticated API. The server must derive actorId
// from a verified session, NEVER from a request body or user-supplied header.
export function canEdit(scene, actorId) {
  return typeof actorId === 'string' && !!actorId &&
    (scene.ownerId === actorId || (scene.editors || []).includes(actorId));
}
export function applyScenePatch(scene, patch, actorId, expectedVersion) {
  if (!canEdit(scene, actorId)) return {ok:false,code:403};
  if (!Number.isSafeInteger(expectedVersion) || scene.version !== expectedVersion) return {ok:false,code:409};
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return {ok:false,code:400};
  if (Object.keys(patch).some(k=>!['title','objects'].includes(k))) return {ok:false,code:400};
  if (patch.title !== undefined && (typeof patch.title !== 'string' || patch.title.length>100)) return {ok:false,code:400};
  if (patch.objects !== undefined) {
    if (!Array.isArray(patch.objects) || patch.objects.length>200) return {ok:false,code:400};
    const ids=new Set();
    for(const obj of patch.objects) {
      if (!obj || typeof obj.id!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(obj.id) || ids.has(obj.id)) return {ok:false,code:400};
      ids.add(obj.id);
      for(const key of ['position','scale'])
        if (!Array.isArray(obj[key]) || obj[key].length!==3 ||
            !obj[key].every(n=>typeof n==='number' && Number.isFinite(n)) ||
            (key==='scale' && obj[key].some(n=>n<=0))) return {ok:false,code:400};
      if (Object.keys(obj).some(k=>!['id','kind','position','scale','color'].includes(k))) return {ok:false,code:400};
    }
  }
  return {ok:true,scene:{...scene,...patch,version:scene.version+1,updatedBy:actorId}};
}
