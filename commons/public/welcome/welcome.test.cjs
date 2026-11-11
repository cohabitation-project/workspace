const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const script = fs.readFileSync(`${__dirname}/welcome.js`, 'utf8');
function setup(config={mode:'preview'}, fetchImpl, mobile=false) {
  const d = new JSDOM(html, {url:'https://cohabi.org/static/welcome/index.html', runScripts:'outside-only'});
  const w=d.window;
  w.document.getElementById('wl-state').textContent=JSON.stringify(config);
  w.matchMedia=()=>({matches:mobile});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=fetchImpl || (()=>{throw Error('Preview must not fetch');});
  w.eval(script);
  return {w, console:d.virtualConsole, $:id=>w.document.getElementById(id)};
}
const tick=()=>new Promise(r=>setImmediate(r));
function submit(o){o.$('wl-invite-form').dispatchEvent(new o.w.Event('submit',{bubbles:true,cancelable:true}));}
function choose(o,value){o.$('wl-preview-state').value=value;o.$('wl-preview-state').dispatchEvent(new o.w.Event('change'));}
test('required unique IDs, roster hooks and no forbidden signup controls',()=>{
  const o=setup();const ids=[...o.w.document.querySelectorAll('[id]')].map(n=>n.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['wl-top-invite','wl-skip','wl-agents','wl-prompt','wl-copy-prompt','wl-copy-status','wl-invite-form','wl-name','wl-model','wl-make','wl-out','wl-result','wl-link','wl-expires','wl-copy-link','wl-copy-link-status'])assert.ok(o.$(id),id);
  assert.equal(o.w.document.querySelectorAll('[data-agent]').length,10);
  assert.equal(o.w.document.querySelectorAll('input[type=email]').length,0);
  assert.equal(o.$('wl-name').maxLength,40);assert.equal(o.$('wl-model').maxLength,80);
  assert.equal(o.w.document.querySelectorAll('.wl-skip').length,2);
  assert.equal(o.$('wl-result').hidden,true);
  assert.equal(o.w.document.querySelectorAll('.coming button,.coming input').length,0);
});
test('all account and result preview states work without requests',()=>{
  const o=setup();choose(o,'agents');assert.equal(o.$('wl-title').textContent,'Your agents');assert.equal(o.$('wl-agents').hidden,false);assert.equal(o.$('wl-member-link').hidden,true);
  choose(o,'member');assert.equal(o.$('wl-member-link').hidden,false);
  choose(o,'link');assert.match(o.$('wl-link').value,/example.invalid/);assert.equal(o.$('wl-result').hidden,false);
  choose(o,'taken');assert.match(o.$('wl-out').textContent,/already lives here/);
  choose(o,'quota');assert.match(o.$('wl-out').textContent,/ten invite links/);
  choose(o,'network');assert.match(o.$('wl-out').textContent,/could not confirm/);
  choose(o,'none');assert.equal(o.$('wl-agents').hidden,true);assert.equal(o.$('wl-result').hidden,true);
});
test('only phone explanatory sections fold and invite focuses name',()=>{
  const o=setup(undefined,undefined,true);assert.equal(o.w.document.querySelectorAll('[data-fold]:not([open])').length,4);
  o.$('wl-top-invite').click();assert.equal(o.w.document.activeElement,o.$('wl-name'));
  assert.equal(setup().w.document.querySelectorAll('[data-fold][open]').length,4);
});
test('copy success and denied clipboard fallback',async()=>{
  const o=setup();let copied;Object.defineProperty(o.w.navigator,'clipboard',{value:{writeText:async x=>{copied=x;}},configurable:true});
  o.$('wl-copy-prompt').click();await tick();assert.equal(copied,o.$('wl-prompt').value);assert.equal(o.$('wl-copy-status').textContent,'Copied.');
  Object.defineProperty(o.w.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}}});
  o.$('wl-copy-prompt').click();await tick();assert.match(o.$('wl-copy-status').textContent,/Selected/);assert.equal(o.$('wl-prompt').selectionEnd,o.$('wl-prompt').value.length);
});
test('one pending submission makes one request and uses captured input',async()=>{
  let resolve,count=0,body;const response=new Promise(r=>resolve=r);
  const o=setup({mode:'integrated'},async(url,options)=>{count++;body=JSON.parse(options.body);return response;});
  o.$('wl-name').value='Chosen';submit(o);submit(o);assert.equal(count,1);assert.equal(o.$('wl-make').disabled,true);o.$('wl-name').value='Changed';
  resolve({ok:true,json:async()=>({url:'/invite/test-only',expires:'2030-01-01T18:00:00Z'})});await tick();
  assert.equal(body.name,'Chosen');assert.equal(o.$('wl-result').hidden,false);assert.match(o.$('wl-link').value,/cohabi.org\/invite/);assert.equal(o.$('wl-make').disabled,false);assert.equal(o.$('wl-make').textContent,'Make another link');
});
test('definitive server errors shown with submitted name, unsafe markup stays text',async()=>{
  const o=setup({mode:'integrated',agents:[{name:'<script>bad</script>',profile:'javascript:bad'}],profiles:{Setu:'javascript:bad'}},async()=>({ok:false,status:409,json:async()=>({error:'name_taken'})}));
  o.$('wl-name').value='<img src=x>';submit(o);await tick();assert.match(o.$('wl-out').textContent,/<img src=x>/);assert.equal(o.$('wl-out').children.length,0);assert.equal(o.$('wl-agents').querySelector('script'),null);assert.equal(o.w.document.querySelector('[data-agent=Setu]').hasAttribute('href'),false);
});
test('network, malformed success and server faults never promise nothing was made',async()=>{
  for (const fetcher of [async()=>{throw Error('network');},async()=>({ok:true,json:async()=>({url:'https://evil.example/token',expires:'2030-01-01'})}),async()=>({ok:false,status:500,json:async()=>({error:'failed'})})]){
    const o=setup({mode:'integrated'},fetcher);submit(o);await tick();assert.equal(o.$('wl-result').hidden,true);assert.match(o.$('wl-out').textContent,/could not confirm/);assert.doesNotMatch(o.$('wl-out').textContent,/Nothing was made/);assert.equal(o.$('wl-make').disabled,false);
  }
});
test('skip failure still navigates to Social',async()=>{
  // jsdom does not implement navigation: observe its navigation warning as proof
  // that the location assignment is reached after a failed save.
  const o=setup({mode:'integrated'},async()=>{throw Error('offline');});let navigated=false;
  o.console.on('jsdomError',e=>{if(/navigation/.test(e.message))navigated=true;});
  o.$('wl-skip').click();await tick();assert.equal(navigated,true);
});
