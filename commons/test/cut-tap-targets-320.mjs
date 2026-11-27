// Measure visible tap-target sizes on signed-in /cut/ on the smallest phone, 320x568, and that the page fits 320 wide.
// Candidate for placement as commons/test/cut-tap-targets.mjs; uses Chromium CDP (no Playwright).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN_TEST = path.basename(HERE) === 'test' && path.basename(path.dirname(HERE)) === 'commons';
const ROOT = path.resolve(HERE, IN_TEST ? '../..' : '../../..');
const [{ freePort }, auth, store] = await Promise.all([
  import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href),
  import(pathToFileURL(path.join(ROOT, 'commons/lib/auth.mjs')).href),
  import(pathToFileURL(path.join(ROOT, 'commons/lib/store.mjs')).href),
]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIEW = { width: 320, height: 568 };
const BROWSERS = [process.env.CHROME_PATH, process.env.CHROMIUM_PATH, '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
async function findBrowser() {
  for (const p of BROWSERS) try { await fs.promises.access(p, fs.constants.X_OK); return p; } catch {}
  return null;
}
async function cdp(port) {
  let url;
  for (let i=0; i<80 && !url; i++) {
    try { url=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x=>x.type==='page')?.webSocketDebuggerUrl; } catch {}
    if (!url) await sleep(250);
  }
  assert.ok(url, 'Chromium exposes page CDP');
  const ws=new WebSocket(url); await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true});});
  let id=0; const pending=new Map(); ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(!m.id||!pending.has(m.id))return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);});
  return { call(method,params={}) { return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));}); }, close(){ws.close();} };
}
async function evaluate(driver, expression, awaitPromise=false) {
  const r=await driver.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise});
  if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result?.value;
}
const SCAN = `(() => {
 const controls=[...document.querySelectorAll('button,a,[role="button"],input')];
 const seen=new Set();
 return controls.filter(e=>{if(seen.has(e))return false;seen.add(e);const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0;}).map(e=>{
  const r=e.getBoundingClientRect(), tag=e.tagName.toLowerCase(), name=(e.getAttribute('aria-label')||e.innerText||e.value||e.getAttribute('title')||e.getAttribute('type')||tag).replace(/\\s+/g,' ').trim().slice(0,100);
  const parent=e.closest('p,li'), inlineException=tag==='a'&&!!parent&&getComputedStyle(e).display==='inline';
  const w=Math.round(r.width*100)/100,h=Math.round(r.height*100)/100;
  return {name:name||tag,tag,w,h,inlineException,small:!inlineException&&(r.width<44||r.height<44)};
 });
})()`;
test('visible /cut/ tap targets at 320x568 (document fits 320)', {timeout:120000}, async t=>{
 const browser=await findBrowser(); if(!browser){t.skip('No Chromium/Chrome executable installed; tap targets not measured.');return;}
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'cut-tap-data-')), profile=fs.mkdtempSync(path.join(os.tmpdir(),'cut-tap-profile-'));
 const port=await freePort(), base=`http://127.0.0.1:${port}`;
 store.init(data); const member=store.addMember({id:'h_cut_tap_targets',name:'Cut Tap Targets',kind:'human'});
 const cookie=auth.sessionCookie(member.id,false,member.sessionVersion||0);
 const server=spawn(process.execPath,['commons/server.mjs'],{cwd:ROOT,env:{...process.env,ASHRAM_PORT:String(port),COMMONS_DATA:data,COMMONS_FAKE_LLM:'1',COMMONS_NO_SPEND_POLL:'1'},stdio:['ignore','ignore','pipe']});
 let serverError='';server.stderr?.setEncoding('utf8');server.stderr?.on('data',s=>{serverError=(serverError+s).slice(-4000);});
 let chrome,driver,targets,docW;
 try {
  let boot=false;for(let i=0;i<80&&!boot;i++){try{boot=(await fetch(`${base}/api/presence`)).ok;}catch{}if(!boot)await sleep(250);} assert.ok(boot,`isolated Commons server booted; stderr=${serverError}`);
  const browserPort=await freePort();chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--force-device-scale-factor=1',`--window-size=${VIEW.width},${VIEW.height}`,'--remote-allow-origins=*',`--remote-debugging-port=${browserPort}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  driver=await cdp(browserPort);await driver.call('Page.enable');await driver.call('Runtime.enable');await driver.call('Network.enable');
  await driver.call('Emulation.setDeviceMetricsOverride',{...VIEW,deviceScaleFactor:1,mobile:false,screenWidth:VIEW.width,screenHeight:VIEW.height});
  const pair=cookie.split(';',1)[0],eq=pair.indexOf('=');assert.ok(eq>0);
  const set=await driver.call('Network.setCookie',{name:pair.slice(0,eq),value:pair.slice(eq+1),url:base,path:'/',httpOnly:true,sameSite:'Strict'});assert.equal(set?.success,true);
  await driver.call('Page.navigate',{url:`${base}/cut/`});let ready=false;for(let i=0;i<80&&!ready;i++){ready=await evaluate(driver,"document.readyState==='complete'&&location.pathname==='/cut/'");if(!ready)await sleep(100);}assert.ok(ready,'/cut/ loaded');
  await evaluate(driver,'document.fonts?document.fonts.ready:Promise.resolve()',true);await evaluate(driver,'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))',true);
  targets=await evaluate(driver,SCAN); docW=await evaluate(driver,'document.documentElement.scrollWidth');
 } finally {if(driver)driver.close();if(chrome)chrome.kill();server.kill();for(const d of [data,profile])try{fs.rmSync(d,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}}
 assert.ok(targets.length>0,'at least one visible candidate control was measured');
 for(const x of targets)console.log(`${JSON.stringify(x.name)} ${x.w}x${x.h} ${x.small?'SMALL':x.inlineException?'INLINE-EXCEPTION':'ok'}`);
 const small=targets.filter(x=>x.small);console.log(`MEASURED viewport=${VIEW.width}x${VIEW.height} controls=${targets.length} small=${small.length}`);
 console.log(`docWidth=${docW}`); assert.ok(docW<=VIEW.width,`document width ${docW} fits ${VIEW.width}`);
 assert.equal(small.length,0,`${small.length} visible control(s) under 44x44; see per-control measurements above`);
});
