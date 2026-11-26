
const fs=require('fs');
const code=fs.readFileSync(process.argv[2],'utf8');
const document={querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,
  addEventListener:(t,fn)=>{if(t==='click')globalThis.__handler=fn;},createElement:()=>({querySelector:()=>null,classList:{add(){}},style:{},dataset:{}})};
globalThis.document=document; globalThis.window={};
const f=new Function('document','window','fetch','setTimeout','FileReader','Event','location',code);
let fetchImpl=null;
f(document,{},(...a)=>fetchImpl(...a),setTimeout,function(){},{},{});
const h=globalThis.__handler;
if(typeof h!=='function'){console.log('NO HANDLER REGISTERED');process.exit(1);}
function scene(reply){ const status={textContent:''};
  const btn={disabled:false,getAttribute:()=> 'ord 1/2',parentElement:{querySelector:(s)=> s==='[role=status]'?status:null}};
  const ev={target:{closest:()=>btn},preventDefault(){globalThis.__pd=true}};
  fetchImpl=async(url,opt)=>{ globalThis.__url=url; globalThis.__opt=opt;
    return { ok: reply.ok, status: reply.status, json: async()=>reply.body }; };
  h(ev); return {status,btn}; }
const tick=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
  const cases=[
    ['draft',{ok:true,status:200,body:{order:'o1',sent:true,printer:{provider:'printful',state:'draft',provider_order:9001}}}],
    ['failed',{ok:true,status:200,body:{order:'o1',sent:false,printer:{provider:'printful',state:'failed',error:'base cost is 12.00'}}}],
    ['403',{ok:false,status:403,body:{error:'only the maker or a steward can send this order to the printer'}}],
  ];
  for(const [name,reply] of cases){
    const s=scene(reply); await tick();
    console.log(JSON.stringify({case:name,path:globalThis.__url,method:globalThis.__opt.method,credentials:globalThis.__opt.credentials,headers:globalThis.__opt.headers,status:s.status.textContent,disabled:s.btn.disabled}));
  }
  const status={textContent:''}; const btn={disabled:false,getAttribute:()=>'o2',parentElement:{querySelector:()=>status}};
  fetchImpl=async()=>{throw new Error('offline')};
  h({target:{closest:()=>btn},preventDefault(){}}); await tick();
  console.log(JSON.stringify({case:'offline',status:status.textContent,disabled:btn.disabled}));
  // a click that is not on the button must not call fetch at all
  let called=false; fetchImpl=async()=>{called=true;return{ok:true,status:200,json:async()=>({})}};
  h({target:{closest:()=>null},preventDefault(){}}); await tick();
  console.log(JSON.stringify({case:'other-click',fetchCalled:called}));
})();
