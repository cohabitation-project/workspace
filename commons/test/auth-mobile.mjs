#!/usr/bin/env node
// Real browser release check. Requires playwright + its Chromium. Uses temporary synthetic accounts only.
// node commons/test/auth-mobile.mjs /tmp/auth-mobile-evidence
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(import.meta.dirname,'../..');
const out=path.resolve(process.argv[2]||'/tmp/auth-mobile-evidence');fs.mkdirSync(out,{recursive:true});
const data=fs.mkdtempSync(path.join(os.tmpdir(),'auth-mobile-'));
const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['commons/server.mjs'],{cwd:root,env:{...process.env,COMMONS_DATA:data,ASHRAM_PORT:String(port),COMMONS_FAKE_LLM:'1',OPENROUTER_API_KEY:'',LLM_API_KEY:''},stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/api/rooms')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready,'server started');
 browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 for(const width of [320,360,390,430,768,1280,1536]) for(const route of ['signin','signup']){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/'+route);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.cx-art').evaluate(img=>img.complete?Promise.resolve():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} ${width}: no horizontal overflow`);
  assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src)),[],`${route} ${width}: images load`);
  for(const button of await page.locator('button:visible').all()){const rect=await button.boundingBox();assert.ok(rect.height>=44,`${route} ${width}: button has 44px target`);}
  if(route==='signin'){
   await page.locator('#si-show').check();assert.equal(await page.locator('#si-pass').getAttribute('type'),'text');
   await page.locator('#si-forgot').click();assert.ok(await page.locator('#si-forgot-help').isVisible());assert.ok(await page.locator('#si-code').evaluate(el=>el===el.ownerDocument.activeElement));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'expanded recovery stays within viewport');
   await page.screenshot({path:path.join(out,`signin-recovery-${width}.png`),fullPage:true});
   await page.locator('#si-forgot').click();await page.locator('#si-recovery summary').click();await page.locator('#si-show').uncheck();
  }
  await page.screenshot({path:path.join(out,`${route}-${width}.png`),fullPage:true});assert.deepEqual(errors,[],`${route} ${width}: no script errors`);await page.close();
 }
 console.log('PASS: 14 layouts + 7 expanded recovery layouts, loaded art, controls, target sizes, script errors. Evidence:',out);
}finally{await browser?.close();server.kill();fs.rmSync(data,{recursive:true,force:true});}
