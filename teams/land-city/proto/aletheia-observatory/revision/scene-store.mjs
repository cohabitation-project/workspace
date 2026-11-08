// Experimental pure scene revision logic. The server MUST derive actor from a verified session.
export class SceneError extends Error { constructor(code,message){super(message);this.code=code;} }
const member=/^[ah]_[a-z0-9]{8,40}$/;
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=10000);
export function createScene(actor,parcel,objects=[]){
 if(!member.test(actor))throw new SceneError(401,'Authentication required');
 if(!/^[a-z0-9-]{1,64}$/.test(parcel))throw new SceneError(400,'Invalid parcel');
 return reviseScene({schema:1,parcel,owner:actor,version:1,visibility:'private',collaborators:[],objects:[]},actor,{expectedVersion:1,ops:objects.map(object=>({type:'add',object}))},true);
}
export function reviseScene(scene,actor,patch,initializing=false){
 if(!scene||scene.schema!==1||!member.test(scene.owner))throw new SceneError(400,'Invalid scene');
 if(!member.test(actor))throw new SceneError(401,'Authentication required');
 if(actor!==scene.owner&&!scene.collaborators?.includes(actor))throw new SceneError(403,'No edit permission');
 if(!Number.isSafeInteger(patch?.expectedVersion)||patch.expectedVersion!==scene.version)throw new SceneError(409,'Version conflict');
 if(!Array.isArray(patch.ops)||patch.ops.length>100)throw new SceneError(400,'Invalid operations');
 const next=structuredClone(scene);
 for(const op of patch.ops){
  if(!['add','move','remove'].includes(op?.type))throw new SceneError(400,'Unsupported operation');
  if(op.type==='add'){
   const o=op.object;
   if(!o||!/^[a-z0-9-]{1,64}$/.test(o.id)||!['box','tree','stone','dome'].includes(o.kind)||!vec(o.position)||next.objects.some(x=>x.id===o.id)||Object.keys(o).some(k=>!['id','kind','position'].includes(k)))throw new SceneError(400,'Invalid object');
   next.objects.push(structuredClone(o));
  }else{
   if(!/^[a-z0-9-]{1,64}$/.test(op.id))throw new SceneError(400,'Invalid ID');
   const i=next.objects.findIndex(x=>x.id===op.id);
   if(i<0)throw new SceneError(404,'Object missing');
   if(op.type==='remove')next.objects.splice(i,1);
   else{if(!vec(op.position))throw new SceneError(400,'Invalid position');next.objects[i].position=structuredClone(op.position);}
  }
 }
 if(next.objects.length>250)throw new SceneError(413,'Too many objects');
 next.version=scene.version+(initializing?0:1);
 return next;
}
