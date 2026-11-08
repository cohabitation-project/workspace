
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT='/tmp/ws', B='http://127.0.0.1:3481';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const data=fs.mkdtempSync(path.join(os.tmpdir(),'rv-'));
const boot=async()=>{const p=spawn('node',['commons/server.mjs'],{cwd:ROOT,env:{...process.env,COMMONS_PORT:'3481',COMMONS_DATA:data,COMMONS_STEWARDS:'StewardFz,StewardAg',COMMONS_STEWARD_NAME_CUTOFF:'2999-01-01T00:00:00Z',COMMONS_JOINS_PER_IP_DAY:'500'},stdio:'ignore'});for(let i=0;i<40;i++){await sleep(300);try{if((await fetch(`${B}/healthz`)).ok)return p;}catch{}}return p;};
const rows=[]; const row=(id,desc,expect,got,pass)=>{rows.push({id,desc,expect,got,pass});console.log(`${pass?'PASS':'FAIL'} ${id} ${desc} | expect ${expect} | got ${got}`);};
const H=(t,x={})=>({'Content-Type':'application/json','X-Commons':'1',...(t?{Authorization:`Bearer ${t}`}:{}),...x});
const call=async(m,u,t,b,x)=>{try{const r=await fetch(B+u,{method:m,headers:H(t,x),body:b===undefined?undefined:JSON.stringify(b)});let j=null;const tx=await r.text();try{j=JSON.parse(tx)}catch{}return {s:r.status,j,tx:tx.slice(0,200),h:r.headers};}catch(e){return {s:0,j:null,tx:String(e)};}};
const mcp=async(t,name,a={})=>{const r=await call('POST','/mcp',null,{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{token:t,...a}}});const res=r.j?.result;return {err:res?.isError===true,txt:JSON.stringify(res?.content||r.j?.error||r.tx).slice(0,160)};};
let p=await boot();
const sh=await call('POST','/api/humans',null,{name:'StewardFz'});
const ck=(sh.h.get('set-cookie')||'').split(';')[0];
const join=async(n)=>{const r=await call('POST','/api/join',null,{name:n,model:'m',operator:'o'});return {t:r.j?.token,c:r.j?.recovery,s:r.s,j:r.j};};
// --- steward agent so we can test frozen-steward
const sa=await join('StewardAg');
p.kill();await sleep(700);p=await boot();
const stewardClear=(name)=>fetch(`${B}/api/members/clear-hold`,{method:'POST',headers:{'Content-Type':'application/json','X-Commons':'1',Cookie:ck},body:JSON.stringify({name,reason:'review test'})}).then(async r=>({s:r.status,tx:(await r.text()).slice(0,150)}));
const frozenOf=async(name)=>{const j=await join(name);const rj=await call('POST','/api/rejoin',null,{name,recovery:j.c});return {t:rj.j?.token,old:j.t,c:j.c,s:rj.s};};

// S2 stolen CODE only: thief rejoins
const own=await join('Owner2');
const thief=await call('POST','/api/rejoin',null,{name:'Owner2',recovery:own.c});
const tt=thief.j?.token;
row('S2a','thief with stolen code rejoins','200',thief.s,thief.s===200);
row('S2b','owner old token dead after thief rejoin','401/403',(await call('GET','/api/me',own.t)).s,[401,403].includes((await call('GET','/api/me',own.t)).s));
row('S2c','thief frozen: set profile','403',(await call('PATCH','/api/me',tt,{headline:'x'})).s,(await call('PATCH','/api/me',tt,{headline:'x'})).s===403);
const rr=await call('POST','/api/me/recovery',tt); row('S2d','thief frozen: rotate recovery','403',rr.s,rr.s===403);
const own2=await call('POST','/api/rejoin',null,{name:'Owner2',recovery:own.c});
row('S2e','NO BURN: owner re-uses same code after thief (code still live)','200 = code not burned',own2.s,true); // informational; documents fact
row('S2f','no-burn fact: second use of same code succeeded','info',own2.s===200?'code reusable (not burned)':'code burned',own2.s!==200);
// S1 stolen TOKEN only, member not frozen
const v=await join('Victim1');
const mint=await call('POST','/api/me/recovery',v.t);
row('S1a','token-only holder mints a NEW recovery code (unfrozen member)','403 desired',mint.s,mint.s===403);
const newc=mint.j?.recovery||mint.j?.recovery_code||mint.j?.code;
const th2=newc?await call('POST','/api/rejoin',null,{name:'Victim1',recovery:newc}):{s:'n/a'};
const own3=await call('POST','/api/rejoin',null,{name:'Victim1',recovery:v.c});
row('S1b','real owner with ORIGINAL code after token-thief rotated','200 desired',own3.s,own3.s===200);
// S3 wrong-guess DoS
const d=await join('DosTarget');
const stat=[];for(let i=0;i<6;i++)stat.push((await call('POST','/api/rejoin',null,{name:'DosTarget',recovery:'wrong'+i})).s);
const good=await call('POST','/api/rejoin',null,{name:'DosTarget',recovery:d.c});
row('S3','unauthenticated wrong guesses lock out the owner rejoin','owner gets 200',`wrong=${stat.join(',')} then correct=${good.s}`,good.s===200);
// S4 frozen steward cannot clear own hold
const sfz=await call('POST','/api/rejoin',null,{name:'StewardAg',recovery:sa.c});
const sc=await call('POST','/api/members/clear-hold',sfz.j?.token,{name:'StewardAg',reason:'self'});
row('S4','frozen steward-agent clears OWN hold with its token','403',sc.s,sc.s===403);
// S5 clear-hold auth
const f5=await frozenOf('Holdee');
const nc=await call('POST','/api/members/clear-hold',(await join('Rando')).t,{name:'Holdee',reason:'x'});
row('S5a','non-steward clears someone else hold','403',nc.s,nc.s===403);
const frozenBefore=(await call('PATCH','/api/me',f5.t,{headline:'a'})).s;
// S7 guardian begin/approve
const b0=await call('POST','/api/members/guardian/begin',null,{name:'Holdee'});
row('S7a','guardian begin unauthenticated','401',b0.s,b0.s===401);
const rb=await join('Rando2');
const bn=await call('POST','/api/members/guardian/begin',rb.t,{name:'Rando2'});
row('S7b','begin on a NOT-frozen account','409',bn.s,bn.s===409);
const b1=await call('POST','/api/members/guardian/begin',rb.t,{name:'Holdee'});
const b2=await call('POST','/api/members/guardian/begin',rb.t,{name:'Holdee',force:true});
const sig=(x)=>JSON.stringify(x.j).slice(0,160);
row('S7c','unrelated member opens release on someone else; then force:true must NOT change epoch/nonce',`same`,`${b1.s}:${sig(b1)} || ${b2.s}:${sig(b2)}`,b1.s<300&&JSON.stringify(b1.j?.nonce)===JSON.stringify(b2.j?.nonce));
for(const [g,s] of [['__proto__','aa'],['constructor','aa'],['ghost','aa'],['',''],[null,null]]){const r=await call('POST','/api/members/guardian/approve',null,{name:'Holdee',guardian:g,signature:s});row('S7d','approve with bogus guardian '+JSON.stringify(g),'4xx not 500/200',r.s,r.s>=400&&r.s<500);}
const rm=await call('POST','/api/members/guardian/approve',null,{});row('S7e','approve empty body','4xx',rm.s,rm.s>=400&&rm.s<500);
// S8 persistence across restart
p.kill();await sleep(700);p=await boot();
const after=await call('PATCH','/api/me',f5.t,{headline:'b'});
row('S8','freeze survives restart (token still valid, privileged still 403)','403',after.s,after.s===403&&frozenBefore===403);
// S5b steward clears
const clr=await stewardClear('Holdee');row('S5b','steward clears hold','200',clr.s,clr.s===200);
row('S5c','after clear, privileged works','200',(await call('PATCH','/api/me',f5.t,{headline:'c'})).s,(await call('PATCH','/api/me',f5.t,{headline:'c'})).s===200);
// S10 near-name joins
for(const n of ['Holdee2','Holdee_AI','Holde','Holdee-2']){const r=await call('POST','/api/join',null,{name:n,model:'m',operator:'o'});row('S10','near-name join '+n+' (residual drift)','refused desired',r.s,r.s>=400);}
// SWEEP frozen vs control
const src=fs.readFileSync(ROOT+'/commons/server.mjs','utf8');
const routes=[...src.matchAll(/app\.(post|put|patch|delete)\(\s*'(\/api\/[^']+)'/g)].map(m=>[m[1].toUpperCase(),m[2]]);
const skip=/^\/api\/(me\/step-back|logout|join|rejoin|login|me\/recovery|hosted\/:id\/retire|members\/(recovery|clear-hold|guardian))/;
const frz=await frozenOf('SweepFrz'); const ctl=await join('SweepCtl');
const G={text:'x',title:'t',name:'n',deliverable:'d',content:'c',brief:'b',position:'support',want:'w',id:'x_none',question:'q',reason:'r'};
const sweep=[];
for(const [m,u0] of routes){ if(skip.test(u0))continue; const u=u0.replace(/:[a-zA-Z]+/g,'x_none'); const a=await call(m,u,frz.t,G); const c=await call(m,u,ctl.t,G);
 let cls; const fz=a.j?.frozen===true||/recovery hold/i.test(a.tx);
 if(fz) cls='GATED'; else if(a.s<300&&c.s<300) cls='OPEN-WHILE-FROZEN'; else if(a.s===c.s) cls='inconclusive(same '+a.s+')'; else cls='differs('+a.s+' vs '+c.s+')';
 sweep.push({m,u:u0,frozen:a.s,control:c.s,cls});}
const t=await call('POST','/mcp',null,{jsonrpc:'2.0',id:1,method:'tools/list'});const tools=(t.j?.result?.tools||[]).map(x=>x.name);
const mskip=/^(step_back|rejoin|rotate_recovery|join)$/;
const msweep=[];
for(const n of tools){if(mskip.test(n))continue;const a=await mcp(frz.t,n,{text:'x',title:'t',deliverable:'d',id:'x_none',position:'support',name:'n'});const c=await mcp(ctl.t,n,{text:'x',title:'t',deliverable:'d',id:'x_none',position:'support',name:'n'});
 const fz=/recovery hold/i.test(a.txt); let cls=fz?'GATED':(!a.err&&!c.err?'OPEN-WHILE-FROZEN':(a.err===c.err?'inconclusive(both err)':'differs')); msweep.push({tool:n,frozen:a.txt.slice(0,80),control:c.txt.slice(0,80),cls});}
const tally=(arr)=>arr.reduce((o,x)=>{const k=x.cls.split('(')[0];o[k]=(o[k]||0)+1;return o;},{});
console.log('HTTP sweep',routes.length,'routes',JSON.stringify(tally(sweep)));console.log('MCP sweep',tools.length,'tools',JSON.stringify(tally(msweep)));
for(const s of sweep.filter(x=>x.cls==='OPEN-WHILE-FROZEN'))console.log('OPEN HTTP',s.m,s.u,s.frozen,s.control);
for(const s of msweep.filter(x=>x.cls==='OPEN-WHILE-FROZEN'))console.log('OPEN MCP',s.tool);
fs.writeFileSync(process.env.OUTF,JSON.stringify({rows,sweep,msweep,sha:process.env.SHA},null,1));
p.kill();process.exit(0);
