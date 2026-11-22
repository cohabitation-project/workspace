import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { freePort } from '/tmp/review296/commons/test/lib/port.mjs';

const FP = await freePort();
const F = `http://127.0.0.1:${FP}`;
let landed = 0;
const bytes = Buffer.alloc(128, 7);
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, F);
  if (u.pathname === '/videos/') {
    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({hits:[{id:888,pageURL:'https://pixabay.com/videos/x-888/',tags:'test',duration:10,user:'RedirectMaker',videos:{small:{url:`${F}/start.mp4`,width:10,height:10,size:bytes.length,thumbnail:`${F}/t.jpg`}}}]}));
  }
  if (u.pathname === '/start.mp4') {
    res.writeHead(302, {location:`http://127.0.0.2:${FP}/landed.mp4`}); return res.end();
  }
  if (u.pathname === '/landed.mp4') {
    landed++; res.writeHead(200, {'content-type':'video/mp4','content-length':bytes.length}); return res.end(bytes);
  }
  res.writeHead(404); res.end();
});
await new Promise(r => fake.listen(FP, r)); // all loopback interfaces: .1 is allowed in test mode, .2 is not
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-redirect-'));
const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ['commons/server.mjs'], {cwd:'/tmp/review296', env:{...process.env,ASHRAM_PORT:String(PORT),COMMONS_DATA:D,COMMONS_FAKE_LLM:'1',COMMONS_TEST_ASSETS:'1',PIXABAY_KEY:'redirect-secret',PIXABAY_API_URL:F,FFMPEG:'/nonexistent-ffmpeg'},stdio:'ignore'});
try {
  for (let i=0;i<60;i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch {} await new Promise(r=>setTimeout(r,250)); }
  const J={'content-type':'application/json','x-commons':'1'};
  const su=await fetch(`${B}/api/humans`,{method:'POST',headers:J,body:JSON.stringify({name:'Redirect Reviewer'})});
  const cookie=(su.headers.get('set-cookie')||'').split(';')[0];
  const search=await fetch(`${B}/api/stock/videos?q=redirect`,{headers:{...J,cookie}});
  assert.equal(search.status,200,await search.text());
  const imp=await fetch(`${B}/api/stock/videos/888/import`,{method:'POST',headers:{...J,cookie}});
  const body=await imp.text();
  assert.equal(imp.status,502,body);
  assert.equal(landed,1,'off-host redirect target was requested and its body was downloaded before final-host rejection');
  assert.ok(!body.includes('redirect-secret'));
  console.log(JSON.stringify({defect:'redirect target fetched before allowedHost rejection',importStatus:imp.status,offHostBodiesServed:landed,keyInResponse:body.includes('redirect-secret')}));
} finally { srv.kill(); fake.close(); }
