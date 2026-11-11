// DOM wiring checks against markup rendered by the actual feed module.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const base=require('node:path').resolve(__dirname,'..');
const identity=fs.readFileSync(`${base}/public/feed-identity.js`,'utf8');
const feed=fs.readFileSync(`${base}/public/feed.js`,'utf8').replace("import './social.js';",'').replace('export async function','async function');
let html, data;
before(async()=>{
 const os=require('node:os'),path=require('node:path');
 data=fs.mkdtempSync(path.join(os.tmpdir(),'feed-identity-dom-'));
 const store=await import('../lib/store.mjs'),posts=await import('../lib/posts.mjs'),ledger=await import('../lib/ledger.mjs'),house=await import('../lib/house.mjs'),images=await import('../lib/images.mjs');
 store.init(data);posts.init(data);ledger.init(data);house.init(data);images.init(data);
 const member=store.addMember({id:'h_dom_test',name:'DOM Fixture',kind:'human',created:new Date().toISOString(),teams:[],theme:'rose',accent:'lime'});
 posts.create(member,{text:'A longer sample post. '+ 'Some extra words. '.repeat(45)});
 posts.create(member,{text:'A short sample post.'});
 html=(await import('../lib/feedv2.mjs')).feedPage({me:member});
});
after(()=>{if(data)fs.rmSync(data,{recursive:true,force:true});});
function boot(postHandler){
 const dom=new JSDOM(html,{url:'https://preview.invalid/feed',runScripts:'outside-only'}),w=dom.window;
 w.fetch=postHandler||(async()=>{throw Error('Unexpected request');});
 w.eval(identity);return {w,$:id=>w.document.getElementById(id)};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('search finds real rendered posts, empty result and clear restore them',()=>{
 const o=boot();const input=o.$('fx-find-input');const cards=[...o.$('fx-stream').querySelectorAll('.fx-post')];
 assert.ok(cards.length>=2);input.value='a longer sample';input.dispatchEvent(new o.w.Event('input'));
 assert.equal(cards.filter(c=>!c.hidden).length,1);input.value='unfindable-phrase';input.dispatchEvent(new o.w.Event('input'));
 assert.equal(cards.filter(c=>!c.hidden).length,0);assert.match(o.$('fx-find-status').textContent,/0 of/);
 input.value='';input.dispatchEvent(new o.w.Event('input'));assert.equal(cards.filter(c=>!c.hidden).length,cards.length);
});
test('Link opens its field, rejects unsafe scheme, inserts a real markdown link',()=>{
 const o=boot();o.$('fx-add-link').click();assert.equal(o.$('fx-link-row').hidden,false);
 o.$('fx-link-url').value='javascript:alert(1)';o.$('fx-insert-link').click();assert.match(o.$('fx-link-msg').textContent,/complete/);assert.equal(o.$('c-text').value,'');
 o.$('fx-link-url').value='https://cohabi.org/feed';o.$('fx-insert-link').click();assert.equal(o.$('c-text').value,'[Link](https://cohabi.org/feed)');assert.equal(o.$('fx-link-row').hidden,true);
});
test('Photo targets actual upload input; Music targets real release select',()=>{
 const o=boot();let photo=false;o.$('c-files').addEventListener('click',e=>{e.preventDefault();photo=true;});o.$('fx-add-photo').click();assert.equal(photo,true);
 assert.ok(o.$('fx-add-music'));o.$('fx-add-music').click();assert.equal(o.w.document.activeElement,o.$('c-release'));
});
test('one pending post disables both submit paths; failure restores controls and draft',async()=>{
 let calls=0,resolve;const pending=new Promise(r=>resolve=r);
 const o=boot(async()=>{calls++;return pending;});o.w.eval(feed);o.$('c-text').value='Keep this draft if saving fails';
 const submit=()=>o.$('compose').dispatchEvent(new o.w.Event('submit',{bubbles:true,cancelable:true}));
 submit();submit();assert.equal(calls,1);assert.equal(o.$('c-text').disabled,true);assert.equal(o.$('compose').getAttribute('aria-busy'),'true');
 resolve({ok:false,status:500,json:async()=>({error:'Test save failed'})});await tick();
 assert.equal(o.$('c-text').disabled,false);assert.equal(o.$('c-text').value,'Keep this draft if saving fails');assert.match(o.$('compose').querySelector('.form-msg').textContent,/Test save failed/);
});
