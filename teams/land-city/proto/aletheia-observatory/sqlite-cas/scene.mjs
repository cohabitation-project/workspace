export function validateScene(s) {
 if (!s || typeof s!=='object' || Array.isArray(s)) throw Error('scene object required');
 const keys=['schema','revision','visibility','objects'];
 if(Object.keys(s).some(k=>!keys.includes(k))) throw Error('unknown scene field');
 if(s.schema!==1 || !Number.isSafeInteger(s.revision)||s.revision<0||s.visibility!=='private'||!Array.isArray(s.objects)||s.objects.length>256) throw Error('invalid scene');
 const ids=new Set();
 for(const o of s.objects){
  if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!['id','kind','x','y','label'].includes(k)))throw Error('invalid object fields');
  if(typeof o.id!=='string'||!/^[a-z0-9_-]{1,40}$/.test(o.id)||ids.has(o.id))throw Error('duplicate/invalid id'); ids.add(o.id);
  if(!['house','tree','garden','water','path','box'].includes(o.kind)||!Number.isFinite(o.x)||!Number.isFinite(o.y)||Math.abs(o.x)>1000||Math.abs(o.y)>1000||typeof o.label!=='string'||o.label.length>80)throw Error('invalid object');
 }
 return structuredClone(s);
}
export function createHandler({resolveSession, verifyWrite, store}) {
 if(typeof resolveSession!=='function'||typeof verifyWrite!=='function'||!store)throw Error('trusted adapters required');
 return async function handle(req){
  const headers={'Cache-Control':'private, no-store','Content-Type':'application/json; charset=utf-8','Vary':'Cookie, Authorization'};
  const respond=(status,body)=>({status,headers,body});
  try {
   if(!['GET','POST','PATCH'].includes(req.method))return respond(405,{error:'method_not_allowed'});
   const actor=await resolveSession(req);if(typeof actor!=='string'||!/^a_[a-z0-9]+$/.test(actor))return respond(401,{error:'unauthorized'});
   if(req.method==='GET')return respond(200,{scene:await store.get(actor)});
   if(!(await verifyWrite(req,actor)))return respond(403,{error:'write_not_verified'});
   if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.contentType||''))return respond(415,{error:'unsupported_media_type'});
   if(typeof req.body!=='string'||Buffer.byteLength(req.body)>65536)return respond(413,{error:'payload_too_large'});
   let parsed;try{parsed=JSON.parse(req.body)}catch{return respond(400,{error:'invalid_json'})}
   let scene;try{scene=validateScene(parsed)}catch{return respond(400,{error:'invalid_scene'})}
   if(req.method==='POST' && scene.revision!==0)return respond(409,{error:'revision_conflict'});
   const saved=await store.compareAndSwap(actor,req.method==='POST'?null:scene.revision,scene);
   if(!saved)return respond(409,{error:'revision_conflict'});
   return respond(req.method==='POST'?201:200,{scene:saved});
  }catch{return respond(500,{error:'internal_error'})}
 }
}