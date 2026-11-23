/**
 * Visual acceptance fixture for PR #298. It RENDERS THE ACTUAL frontend JS and CSS.
 * It is not a claim of production verification, nor a real Printful mockup.
 * Run: node commons/test/merch-aletheia-visual.mjs
 * Requires puppeteer-core (dev dependency) and a Chromium binary.
 * Saves PNG(s) to teams/build/outputs/aletheia-customizer/ locally (not committed).
 */
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = async (p) => readFile(path.join(root, p));
const artSvg = \`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><defs><radialGradient id="g"><stop stop-color="#ffe49b"/><stop offset=".48" stop-color="#ec7c31"/><stop offset="1" stop-color="#182448"/></radialGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="470" cy="215" r="78" fill="#fff4a5"/><path d="M0 510 250 260 350 375 490 240 680 450 800 365 800 600 0 600" fill="#1b1637"/></svg>\`;
const artData = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(artSvg);
const fees = {card_pct:0.029,card_fixed:.30,cohabi_pct:0};
const product = (key, title, kind, code) => ({
  product:key, title, kind, image:null, placement:'front', area:{width:1800,height:2400},dpi:150,
  template:kind==='colors' ? {width:800,height:850,area:{left:210,top:220,width:380,height:390},background_color:'#f5f2ec',image:null,background:null}:null,
  colors:kind==='colors'?[{name:'Black',code:'#222329'},{name:'White',code:'#ffffff'},{name:'Navy',code:'#1b3158'}]:[],
  sizes:kind==='sizes'?[{name:'16″×20″',area:{width:2400,height:3000},dpi:150,price:29.5},{name:'20″×24″',area:{width:3000,height:3600},dpi:150,price:42.5}]:[{name:'M',area:{width:1800,height:2400},dpi:150,price:16.4}],
  variants:kind==='colors' ? ['Black','White','Navy'].flatMap(color=>['S','M','L'].map((size,i)=>({id:code+i,color,size,price:16.4+i}))) : [{id:12,color:'',size:'16″×20″',price:29.5},{id:13,color:'',size:'20″×24″',price:42.5}],
  current:null
});
const data={listing:'fixture-only',title:'Spiral Sun',maker:'Fixture Creator',page:'Anomaly Art House',art:{id:'fixture-image',url:artData,width:800,height:600},fees,products:[product('tee','Unisex T-Shirt','colors',1),product('mug','Glossy Mug','colors',4),product('canvas','Canvas Print','sizes',7)]};
const html=\`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Customizer screenshot fixture — simulated data</title>
<link rel="stylesheet" href="/static/market.css"><link rel="stylesheet" href="/static/merch-studio-aletheia.css">
<style>body{margin:0;font:15px/1.5 system-ui}button,input{font:inherit} .mk-page{min-height:100vh} .mv-wrap{margin:0 auto} .mv-search{display:flex;gap:10px} .mv-search input{flex:1} .mk-searchbar .btn{padding:9px 22px}</style>
</head><body class="mk-page mv-page" data-mk="home"><div class="mv-wrap">
<p class="mv-eyebrow">Cohabi Market</p>
<nav class="mv-pills"><a class="mv-pill" href="#" aria-current="page">Marketplace</a><a class="mv-pill" href="#">Music</a><a class="mv-pill" href="#">Arts & Crafts</a><a class="mv-pill" href="#">Creator Studio</a></nav>
<form class="mk-searchbar mv-search"><input placeholder="Search music, art, crafts, services, makers..."><button type="button" class="btn">Search</button></form>
<main class="mk-main mv-main"><p class="crumbs small">Marketplace / Spiral Sun / Products</p><h1 class="mk-formh">Put “Spiral Sun” on products</h1><p class="small muted">Select an item, adjust the design, inspect a Printful mockup, then approve. <strong>Fixture only: no real products or payments.</strong></p>
<div id="mp-app" class="mp-app" data-id="fixture-only">Loading...</div></main></div>
<script src="/static/merch-panel-aletheia.js"></script></body></html>\`;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/api/market/listings/fixture-only/merch/panel'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;}
  if(url.pathname==='/static/market.css'||url.pathname==='/static/merch-studio-aletheia.css'||url.pathname==='/static/merch-panel-aletheia.js'){
    const n=url.pathname.slice('/static/'.length);const file=await read('commons/public/'+n);res.setHeader('Content-Type',n.endsWith('.js')?'text/javascript':'text/css');res.end(file);return;
  }
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  res.statusCode=404;res.end('Not found');
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const addr=server.address();let browser;
try{
  const executablePath=process.env.CHROMIUM_PATH || '/usr/bin/chromium';
  browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-setuid-sandbox']});
  const out=path.join(root,'teams/build/outputs/aletheia-customizer');
  await mkdir(out,{recursive:true});
  for(const width of [1536,390]){
    const page=await browser.newPage();await page.setViewport({width,height:width>500?1000:844,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:'+addr.port,{waitUntil:'networkidle0'});
    await page.waitForSelector('.cz-stage');
    const metrics=await page.evaluate(()=>{
      const r=(s)=>{const x=document.querySelector(s);if(!x)return null;const b=x.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};
      return {viewport:innerWidth,bodyScroll:document.body.scrollWidth,rail:r('.cz-rail'),stage:r('.cz-stagewrap'),side:r('.cz-side'),header:r('.cz-head'),buttons:[...document.querySelectorAll('.cz-actions button')].map(x=>({name:x.textContent,disabled:x.disabled}))};
    });
    const image=path.join(out,'product-customizer-'+width+'-fixture.png');
    await page.screenshot({path:image,fullPage:true});
    if(errors.length)throw Error('JS errors: '+errors.join('; '));
    if(metrics.bodyScroll>width+4)throw Error('Horizontal overflow at '+width+': '+JSON.stringify(metrics));
    console.log(JSON.stringify({image,metrics},null,2));
    await page.close();
  }
}finally{if(browser)await browser.close();server.close();}
