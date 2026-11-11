// Public auth DOM + real API regression. Optional test dependency: npm install --no-save --package-lock=false jsdom
// Uses ONLY temporary synthetic accounts. Never points at a deployed server.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(import.meta.dirname, '../..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(),'auth-frontend-'));
let server, base, cookie = '', id, loginLink;
before(async () => {
 const port = await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
 base=`http://127.0.0.1:${port}`;
 server=spawn(process.execPath,['commons/server.mjs'],{cwd:ROOT,env:{...process.env,ASHRAM_PORT:String(port),COMMONS_DATA:DATA,COMMONS_FAKE_LLM:'1',OPENROUTER_API_KEY:'',LLM_API_KEY:''},stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(base+'/api/rooms')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}
 throw new Error('Server failed to start');
});
after(()=>{server?.kill();fs.rmSync(DATA,{recursive:true,force:true});});
async function page(route,script,{signedIn=false,search=''}={}){
 const html=await(await fetch(base+route,{headers:signedIn?{cookie}:{}})).text();
 const dom=new JSDOM(html,{url:base+route+search,runScripts:'outside-only'});const w=dom.window;
 const calls=[],destinations=[];
 w.__location={origin:base,search,assign:to=>destinations.push(to)};
 w.fetch=async(url,options={})=>{calls.push({url,options});const r=await fetch(base+url,{...options,headers:{...options.headers,...(signedIn&&cookie?{cookie}:{})}});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return r;};
 const ui=fs.readFileSync(path.join(ROOT,'commons/public/auth/ui.js'),'utf8').replaceAll('export ','');
 const source=fs.readFileSync(path.join(ROOT,'commons/public',script),'utf8').replace(/^import[^\n]+\n/,'');
 w.eval('const location=window.__location;\n'+ui+'\n'+source);
 return {w,doc:w.document,calls,destinations,close:()=>w.close()};
}
const tick=()=>new Promise(r=>setTimeout(r,10));
async function settled(p,form){for(let i=0;i<100;i++){await tick();if(!p.doc.querySelector(form).hasAttribute('aria-busy'))return;}throw new Error('Submission did not settle');}
function submit(p,form){p.doc.querySelector(form).dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));}
test('public signup creates a social account, shows the private link, and cannot double-submit',async()=>{
 const p=await page('/signup','signup.js');p.doc.querySelector('[name=name]').value='MobileAuthQA';p.doc.querySelector('[name=bio]').value='Synthetic test';
 submit(p,'#signup-form');submit(p,'#signup-form');await settled(p,'#signup-form');
 assert.equal(p.calls.length,1);assert.equal(p.calls[0].url,'/api/humans');assert.equal(p.doc.querySelector('#signup-done').hidden,false);
 loginLink=p.doc.querySelector('#signup-link').value;assert.ok(new URL(loginLink).pathname.startsWith('/login/'));
 id=p.doc.querySelector('#signup-profile').getAttribute('href').slice(3);
 const member=await(await fetch(base+'/api/members/'+id)).json();assert.equal(member.social_only,true);
 p.close();
});
test('signed-in form sets a password through the existing CSRF-guarded endpoint',async()=>{
 const p=await page('/signin','signin.js',{signedIn:true});p.doc.querySelector('#sp-pass').value='synthetic-test-password';submit(p,'#sp-form');await settled(p,'#sp-form');
 assert.equal(p.calls[0].url,'/api/password');assert.equal(p.calls[0].options.headers['X-Commons'],'1');assert.match(p.doc.querySelector('#sp-out').textContent,/Password saved/);assert.equal(p.doc.querySelector('#sp-pass').value,'');p.close();
});
test('password login signs in through real API and returns to a safe next path',async()=>{
 const p=await page('/signin','signin.js',{search:'?next=%2Flabel'});p.doc.querySelector('#si-name').value='MobileAuthQA';p.doc.querySelector('#si-pass').value='synthetic-test-password';submit(p,'#signin-form');await settled(p,'#signin-form');
 assert.equal(p.calls[0].url,'/api/login');assert.deepEqual(p.destinations,['/label']);p.close();
});
test('invalid password stays on the form with a useful error and re-enabled button',async()=>{
 const p=await page('/signin','signin.js');p.doc.querySelector('#si-name').value='MobileAuthQA';p.doc.querySelector('#si-pass').value='wrong';submit(p,'#signin-form');await settled(p,'#signin-form');
 assert.match(p.doc.querySelector('#si-out').textContent,/wrong/);assert.equal(p.destinations.length,0);assert.equal(p.doc.querySelector('#si-login').disabled,false);p.close();
});
test('network failure is visible; request can be retried without a stuck loading state',async()=>{
 const p=await page('/signin','signin.js');p.w.fetch=async()=>{throw new TypeError('offline');};submit(p,'#signin-form');await settled(p,'#signin-form');
 assert.match(p.doc.querySelector('#si-out').textContent,/Connection lost/);assert.equal(p.doc.querySelector('#si-login').disabled,false);p.close();
});
test('password display, recovery focus, code routing and redirect rejection work together',async()=>{
 const p=await page('/signin','signin.js',{search:'?next=%2F%2Fevil.example'});
 p.doc.querySelector('#si-show').click();assert.equal(p.doc.querySelector('#si-pass').type,'text');
 p.doc.querySelector('.si-password-toggle').click();assert.equal(p.doc.querySelector('#si-pass').type,'password');assert.equal(p.doc.querySelector('#si-show').checked,false);
 p.doc.querySelector('#si-forgot').click();assert.equal(p.doc.querySelector('#si-recovery').open,true);assert.equal(p.doc.activeElement.id,'si-code');
 p.doc.querySelector('#si-code').value='ab2cd3';submit(p,'#code-form');assert.deepEqual(p.destinations,['/go/AB2CD3?next=%2Ffeed']);p.close();
});
test('a newly issued device code signs in once, then fails on reuse',async()=>{
 const r=await fetch(base+'/api/device-code',{method:'POST',headers:{cookie,'X-Commons':'1'}});assert.equal(r.status,200);const {code}=await r.json();
 const first=await fetch(base+'/go/'+code+'?next=/label',{redirect:'manual'});assert.equal(first.status,303);assert.equal(first.headers.get('location'),'/label');
 const reused=await fetch(base+'/go/'+code,{redirect:'manual'});assert.equal(reused.status,404);
});
test('private login link still restores the synthetic account',async()=>{
 const r=await fetch(loginLink,{redirect:'manual'});assert.equal(r.status,303);assert.ok(r.headers.get('set-cookie'));
});
test('clipboard denial selects the shown login link and gives a manual-copy instruction',async()=>{
 const p=await page('/signup','signup.js');p.doc.querySelector('#signup-done').hidden=false;p.doc.querySelector('#signup-link').value=base+'/login/synthetic';
 p.doc.querySelector('#signup-copy').click();await tick();assert.match(p.doc.querySelector('#signup-copy-status').textContent,/selected/);assert.equal(p.doc.activeElement.id,'signup-link');p.close();
});
