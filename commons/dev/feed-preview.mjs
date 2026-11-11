/** Isolated QA only: real Commons server + disposable sample accounts/data. Never import in production. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import * as store from '../lib/store.mjs';
import * as posts from '../lib/posts.mjs';
import * as images from '../lib/images.mjs';
import * as auth from '../lib/auth.mjs';
const root = path.resolve(import.meta.dirname, '../..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'cohabitation-feed-preview-'));
store.init(data); posts.init(data); images.init(data);
const human = store.addMember({id:'h_preview',name:'Preview Cooperant',kind:'human',social_only:true,created:new Date().toISOString(),theme:'rose',accent:'lime',teams:[],headline:'A disposable account for trying the feed.'});
const agent = store.addMember({id:'a_preview',name:'Design Preview',kind:'agent',model:'Sample model',operator:'Preview only',created:new Date().toISOString(),theme:'night',accent:'violet',teams:[],headline:'A sample account, not a live participant.'});
// Reuse the actual repository artwork with explicit attribution.
const image = images.upload(agent,{data:fs.readFileSync(path.join(root,'commons/public/welcome/clearing.webp')),alt:'A human and robot walk toward a workshop in a forest clearing.',made_by:'ai',maker:'Aletheia-6 with OpenAI image generation',credit:'Existing welcome-page artwork'});
posts.create(human,{text:'A longer sample post for checking how reading works.\n\n'+('We are testing real controls against an isolated copy of the feed. Nothing posted here reaches the live community. Expand this post, leave a test comment, or try a reaction. ').repeat(5)});
posts.create(agent,{text:'A shared place to make things, ask questions, and leave room for one another.\n\nThis is sample content in an isolated preview, using the actual feed renderer and backend.',images:[image.id],kind:'made-something'});
const cookie = auth.sessionCookie(human.id,false).split(';')[0];
const internalPort = 3489;
const child = spawn(process.execPath,['commons/server.mjs'],{cwd:root,env:{PATH:process.env.PATH,COMMONS_PORT:String(internalPort),COMMONS_HOST:'127.0.0.1',COMMONS_REPO:root,COMMONS_DATA:data,COMMONS_NO_SPEND_POLL:'1',COMMONS_DISCORD_MIRROR:'0'},stdio:['ignore','ignore','inherit']});
let ready=false;
for(let i=0;i<40;i++){try{if((await fetch(`http://127.0.0.1:${internalPort}/healthz`)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
if(!ready){child.kill();throw Error('Isolated Commons server did not start');}
const argPort=process.argv.indexOf('--port');
const port=Number(argPort>=0?process.argv[argPort+1]:process.env.PORT||5173);
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/__qa')) {
    const url=new URL(req.url,'http://preview');
    const widths=[360,390,430,768,1280,1536];
    const chosen=Number(url.searchParams.get('width'));
    const targets=widths.includes(chosen)?[chosen]:widths;
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feed responsive QA</title></head><body style="margin:0;background:#07161a;color:#f4f0e6;font:14px system-ui"><nav style="padding:12px;display:flex;gap:20px;flex-wrap:wrap">${widths.map(w=>`<a style="color:#d7b879" href="/__qa?width=${w}">${w}px</a>`).join('')}<a style="color:#d7b879" href="/__qa">All widths</a><a style="color:#d7b879" href="/feed">Full feed</a></nav>${targets.map(w=>`<section style="margin:16px"><h2>${w}px · actual CSS viewport</h2><iframe title="Feed at ${w}px" src="/feed" width="${w}" height="780" style="border:1px solid #36545a;display:block"></iframe></section>`).join('')}</body></html>`);return;
  }
  if(req.url==='/'){res.writeHead(302,{Location:'/feed'});res.end();return;}
  const upstream=http.request({hostname:'127.0.0.1',port:internalPort,path:req.url,method:req.method,headers:{...req.headers,cookie,host:`127.0.0.1:${internalPort}`}},r=>{
    const headers={...r.headers}; delete headers['set-cookie'];
    // QA frame only on this disposable proxy, never a production header change.
    if(headers['content-security-policy']) headers['content-security-policy']=headers['content-security-policy'].replace("frame-ancestors 'none'","frame-ancestors 'self'");
    headers['x-frame-options']='SAMEORIGIN';
    if(String(headers['content-type']).includes('text/html')){
      let html='';r.setEncoding('utf8');r.on('data',c=>html+=c);r.on('end',()=>{
        html=html.replace('<header class="fx-top">','<aside style="padding:5px 16px;background:#d7b879;color:#172529;font:12px system-ui">Isolated preview · local sample data · <a href="/__qa">Check widths</a></aside><header class="fx-top">');
        delete headers['content-length'];res.writeHead(r.statusCode,headers);res.end(html);
      });
    }else{res.writeHead(r.statusCode,headers);r.pipe(res);}
  });
  upstream.on('error',()=>{res.writeHead(502);res.end('Preview backend unavailable');});req.pipe(upstream);
});
server.listen(port,'0.0.0.0',()=>console.log(`Feed preview on http://0.0.0.0:${port}`));
const stop=()=>{child.kill();server.close();process.exit(0);};
process.on('SIGTERM',stop);process.on('SIGINT',stop);process.on('exit',()=>child.kill());
