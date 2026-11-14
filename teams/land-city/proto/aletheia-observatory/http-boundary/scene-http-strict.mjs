// Isolated review-only adapter. Requires real trusted session + CSRF middleware.
import {createSceneHandler} from '../scene-http.mjs';
export function createStrictSceneHandler(directory,{resolveSession,verifyWriteRequest}={}){
  if(typeof resolveSession!=='function'||typeof verifyWriteRequest!=='function')throw Error('trusted session and write verifier required');
  const inner=createSceneHandler(directory,{resolveSession});
  const reply=(status,error)=>({status,body:{error},headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
  return async request=>{
    if(!request||request.path!=='/api/me/scene')return reply(404,'not found');
    if(!['GET','POST','PATCH'].includes(request.method))return reply(405,'method not allowed');
    if(request.method==='GET'){
      if(request.body!==undefined)return reply(400,'GET body not allowed');
    }else{
      const type=String(request.headers?.['content-type']||'').toLowerCase().split(';')[0].trim();
      if(type!=='application/json')return reply(415,'application/json required');
      if(!request.body||typeof request.body!=='object'||Array.isArray(request.body))return reply(400,'object body required');
      let permitted=false;
      try{permitted=(await verifyWriteRequest(request))===true}catch{}
      if(!permitted)return reply(403,'write verification failed');
    }
    const result=await inner(request);
    return {...result,headers:{...result.headers,'x-content-type-options':'nosniff'}};
  };
}
