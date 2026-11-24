
const { chromium } = require('/tmp/pw/node_modules/playwright-core');
const ids = JSON.parse(require('fs').readFileSync('/tmp/o/ids.json','utf8'));
const B='http://127.0.0.1:4872';
(async()=>{
 const br = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const out={};
 async function ctx(cookie){ const c=await br.newContext({viewport:{width:390,height:844}}); const [n,v]=cookie.split('='); await c.addCookies([{name:n,value:v,url:B}]); return c; }
 // Alice
 const ca=await ctx(ids.ca); const p=await ca.newPage(); const cons=[]; p.on('console',m=>{if(m.type()==='error')cons.push(m.text())}); p.on('response',r=>{if(r.status()>=400)cons.push(r.status()+' '+r.url())}); p.on('pageerror',e=>cons.push('pageerror '+e.message));
 await p.goto(B+'/cut/?videoId='+ids.vid); 
 await p.waitForFunction(()=>document.querySelectorAll('#music-track option').length>1,null,{timeout:10000}).catch(()=>{});
 out.alice={label:(await p.locator('label[for=music-track]').innerText().catch(()=>null)),labelVisible:await p.locator('label[for=music-track]').isVisible(),wrapHidden:await p.evaluate(()=>document.getElementById('music-wrap').hidden),options:await p.evaluate(()=>[...document.querySelectorAll('#music-track option')].map(o=>[o.value,o.textContent])),selH:await p.locator('#music-track').boundingBox(), src:await p.evaluate(()=>document.getElementById('cut-preview').currentSrc), dur: await p.evaluate(()=>document.getElementById('cut-preview').duration)};
 await p.waitForFunction(()=>document.getElementById('cut-preview').readyState>=1,null,{timeout:10000}).catch(()=>{});
 out.alice.dur=await p.evaluate(()=>document.getElementById('cut-preview').duration);
 await p.evaluate(()=>{const s=document.getElementById('trim-start'),e=document.getElementById('trim-end'); out=0; e.value='3.5'; e.dispatchEvent(new Event('input',{bubbles:true})); s.value='1'; s.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.evaluate(()=>{const c=document.getElementById('cover-scrub'); c.value='1.5'; c.dispatchEvent(new Event('input',{bubbles:true})); c.dispatchEvent(new Event('change',{bubbles:true}));});
 out.trim=await p.evaluate(()=>[document.getElementById('cover-scrub').value,document.getElementById('trim-start').value,document.getElementById('trim-end').value]);
 await p.selectOption('#music-track',ids.aid);
 await p.screenshot({path:'/tmp/o/alice-390.png',fullPage:true});
 const [resp]=await Promise.all([p.waitForResponse(r=>r.url().includes('/api/cut/render'),{timeout:60000}), p.click('#export-feed')]);
 out.render={status:resp.status(),body:await resp.text(),req:resp.request().postData()};
 await p.waitForTimeout(2500);
 out.postIt=await p.evaluate(()=>{const a=document.getElementById('export-post');const r=a.getBoundingClientRect();return {hidden:a.closest('[hidden]')!==null,href:a.getAttribute('href'),w:r.width,h:r.height}});
 await p.screenshot({path:'/tmp/o/alice-after-export.png',fullPage:true});
 out.alice.console=cons;
 // Bobby
 const cb=await ctx(ids.cb); const q=await cb.newPage(); await q.goto(B+'/cut/?videoId='+ids.vid);
 await q.waitForFunction(()=>document.querySelectorAll('#music-track option').length>1,null,{timeout:8000}).catch(()=>{});
 out.bobby={options:await q.evaluate(()=>[...document.querySelectorAll('#music-track option')].map(o=>[o.value,o.textContent]))};
 // signed-out
 const cs=await br.newContext({viewport:{width:390,height:844}}); const r=await cs.newPage(); await r.goto(B+'/cut/');
 await r.waitForTimeout(1500);
 out.anon={wrapHidden:await r.evaluate(()=>document.getElementById('music-wrap').hidden),options:await r.evaluate(()=>[...document.querySelectorAll('#music-track option')].map(o=>o.value))};
 console.log(JSON.stringify(out));
 await br.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
