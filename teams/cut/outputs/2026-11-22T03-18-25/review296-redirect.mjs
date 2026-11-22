
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import http from 'node:http'; import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const repo = process.env.REVIEW_REPO;
const { freePort } = await import(pathToFileURL(path.join(repo, 'commons/test/lib/port.mjs')));
const listen = (server, port, host) => new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
const close = (server) => new Promise((resolve) => server.close(resolve));
const FP = await freePort(); const OP = await freePort(); const calls = []; const offhost = [];
const clip = Buffer.alloc(4096, 7);
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${FP}`); calls.push(req.url);
  if (u.pathname === '/videos/') {
    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({hits:[{id:901,pageURL:'https://pixabay.com/videos/x-901/',tags:'redirect test',duration:10,user:'WaveMaker',videos:{small:{url:`http://127.0.0.1:${FP}/start.mp4`,width:10,height:10,size:clip.length}}}]}));
  }
  if (u.pathname === '/start.mp4') { res.writeHead(302, {location:`http://127.0.0.2:${OP}/offhost.mp4`}); return res.end(); }
  res.writeHead(404); res.end();
});
const other = http.createServer((req, res) => { offhost.push({url:req.url,host:req.headers.host}); res.writeHead(200, {'content-type':'video/mp4','content-length':clip.length}); res.end(clip); });
await listen(fake, FP, '127.0.0.1'); await listen(other, OP, '127.0.0.2');
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-redirect-')); const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ['commons/server.mjs'], {cwd:repo,env:{...process.env,ASHRAM_PORT:String(PORT),COMMONS_DATA:D,COMMONS_FAKE_LLM:'1',COMMONS_TEST_ASSETS:'1',PIXABAY_KEY:'pb-test-key',PIXABAY_API_URL:`http://127.0.0.1:${FP}`,FFMPEG:'/nonexistent-ffmpeg',FFPROBE:'/nonexistent-ffprobe'},stdio:'ignore'});
const J={'content-type':'application/json','x-commons':'1'};
try {
  for(let i=0;i<60;i++){try{if((await fetch(`${B}/skill.md`)).ok)break;}catch{} await new Promise(r=>setTimeout(r,250));}
  const su=await fetch(`${B}/api/humans`,{method:'POST',headers:J,body:JSON.stringify({name:'Redirect Reviewer'})});
  const cookie=(su.headers.get('set-cookie')||'').split(';')[0];
  const imp=await fetch(`${B}/api/stock/videos/901/import`,{method:'POST',headers:{...J,cookie}});
  const body=await imp.text();
  console.log(JSON.stringify({importStatus:imp.status,response:body,offhostRequests:offhost,upstreamCalls:calls},null,2));
  assert.equal(imp.status,502,'final off-Pixabay URL is rejected');
  assert.equal(offhost.length,1,'DEFECT: the off-Pixabay redirect target was nevertheless requested');
  console.log('CONFIRMED: rejection happens only after fetch follows the redirect and requests the off-host URL.');
} finally { srv.kill(); await close(fake); await close(other); }
