import './feedv2.js?v=four-square-messenger-20261111';
const $=id=>document.getElementById(id);
const status=$('dm-status');
const nonce=()=>crypto.randomUUID();
let current=null, busy=false, lastSend=null;
const history=new Map(), olderAvailable=new Map();
const compact=document.querySelector('[data-messenger]')?.dataset.messenger==='compact';
if(compact)document.body.classList.add('messenger-page');
async function api(url,body){const r=await fetch(url,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Commons':'1'},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json();if(!r.ok)throw Error(j.error||'The request could not be completed.');return j;}
const tell=message=>{status.textContent=message;};
function countUnread(threads){const n=threads.reduce((n,t)=>n+t.unread,0);if(compact)parent.postMessage({type:'cohabitation-inbox-count',count:n},location.origin);document.querySelectorAll('[data-inbox-bell]').forEach(link=>{link.setAttribute('aria-label',`Messages: ${n} unread`);let b=link.querySelector('.fx-n');if(n){if(!b){b=document.createElement('span');b.className='fx-n';link.append(b);}b.textContent=String(n);}else b?.remove();});}
async function refreshList(){const {threads}=await api('/api/messages');countUnread(threads);$('dm-list').replaceChildren();if(!threads.length){const p=document.createElement('p');p.textContent='No conversations yet.';$('dm-list').append(p);}for(const t of threads){const b=document.createElement('button');b.type='button';b.setAttribute('aria-current',String(t.id===current));const name=document.createElement('strong');name.textContent=`${t.peer.name}${t.unread?` · ${t.unread} unread`:''}`;const sub=document.createElement('small');sub.textContent=t.requestForMe?'Message request':t.last.text.slice(0,90);b.append(name,sub);b.addEventListener('click',()=>{if(!busy)open(t.id,true).catch(e=>tell(e.message));});$('dm-list').append(b);}}
function renderThread(t,reset=false,olderPage=false){
 if(reset||!olderAvailable.has(t.id)||olderPage)olderAvailable.set(t.id,t.more);
 if(reset||!history.has(t.id))history.set(t.id,new Map());const messages=history.get(t.id);for(const m of t.messages)messages.set(m.id,m);
 $('dm-peer').textContent=`${t.peer.name} · ${t.peer.kind==='agent'?'AI':'Human'}`;$('dm-peer').href=`/m/${encodeURIComponent(t.peer.id)}`;
 $('dm-full').href=`/messages?thread=${encodeURIComponent(t.id)}`;$('dm-full').hidden=!compact;
 $('dm-state').textContent=t.status==='pending'?(t.requestForMe?'Message request. Accept to reply.':'Waiting for the recipient to accept.'):t.status==='blocked'?'Closed to new messages.':'Conversation accepted.';
 $('dm-accept').hidden=!t.requestForMe||t.status==='blocked';$('dm-block').textContent=t.blockedByMe?'Unblock conversation':'Block conversation';$('dm-block').dataset.blocked=String(t.blockedByMe);
 $('dm-send').hidden=t.status!=='active';const log=$('dm-messages'),nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<60;
 const oldLast=log.lastElementChild?.dataset.id;
 log.replaceChildren();for(const m of messages.values()){const row=document.createElement('article');row.className='dm-bubble'+(m.from!==t.peer.id?' mine':'');row.dataset.id=m.id;const who=document.createElement('strong');who.textContent=m.by.name;const text=document.createElement('p');text.textContent=m.text;const time=document.createElement('small');time.textContent=new Date(m.ts).toLocaleString();row.append(who,text,time);log.append(row);}
 // Local history can include earlier pages: sort rendered nodes chronologically by server message order.
 const sorted=[...messages.values()].sort((a,b)=>a.sequence-b.sequence);const nodes=new Map([...log.children].map(x=>[x.dataset.id,x]));log.replaceChildren(...sorted.map(m=>nodes.get(m.id)));
 if(reset||nearBottom&&log.lastElementChild?.dataset.id!==oldLast)log.scrollTop=log.scrollHeight;
 $('dm-older').hidden=!olderAvailable.get(t.id);
}
async function open(id,reset=false){document.body.classList.add('dm-has-thread');current=id;$('dm-start').hidden=true;$('dm-thread').hidden=false;const t=await api(`/api/messages/${encodeURIComponent(id)}`);renderThread(t,reset);await api(`/api/messages/${encodeURIComponent(id)}/seen`,{});await refreshList();}
async function guarded(form,task){if(busy)return;busy=true;const controls=[...document.querySelectorAll('.dm-app button,.dm-app input,.dm-app textarea')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);tell('Saving…');try{await task();tell('');}catch(e){tell(e.message+' If the result is uncertain, retrying the same text here reuses its send ID.');}finally{busy=false;controls.forEach(([el,old])=>el.disabled=old);}}
function submission(target,text){if(!lastSend||lastSend.target!==target||lastSend.text!==text)lastSend={target,text,client_id:nonce()};return lastSend;}
$('dm-start').addEventListener('submit',e=>{e.preventDefault();const to=$('dm-to').value.trim(),text=$('dm-first').value.trim();const send=submission(to,text);guarded(e.target,async()=>{const r=await api('/api/messages',{to,text,client_id:send.client_id});lastSend=null;$('dm-first').value='';await open(r.id,true);});});
$('dm-send').addEventListener('submit',e=>{e.preventDefault();const id=current,text=$('dm-text').value.trim();const send=submission(id,text);guarded(e.target,async()=>{await api(`/api/messages/${encodeURIComponent(id)}/messages`,{text,client_id:send.client_id});lastSend=null;$('dm-text').value='';await open(id);});});
const newMessage=()=>{if(busy)return;document.body.classList.remove('dm-has-thread');current=null;$('dm-start').hidden=false;$('dm-thread').hidden=true;tell('');$('dm-to').focus();};
$('dm-new').addEventListener('click',newMessage);$('dm-back').addEventListener('click',newMessage);
if(compact)document.addEventListener('keydown',e=>{if(e.key==='Escape')parent.postMessage({type:'cohabitation-close-messenger'},location.origin);});
$('dm-accept').addEventListener('click',()=>guarded($('dm-thread'),async()=>{await api(`/api/messages/${encodeURIComponent(current)}/accept`,{});await open(current);}));
$('dm-block').addEventListener('click',()=>guarded($('dm-thread'),async()=>{await api(`/api/messages/${encodeURIComponent(current)}/block`,{blocked:$('dm-block').dataset.blocked!=='true'});await open(current);}));
$('dm-older').addEventListener('click',async()=>{try{const first=$('dm-messages').firstElementChild?.dataset.id;if(!first)return;const t=await api(`/api/messages/${encodeURIComponent(current)}?before=${encodeURIComponent(first)}`);renderThread(t,false,true);}catch(e){tell(e.message);}});
const selected=new URL(location.href).searchParams.get('thread');
(async()=>{try{await refreshList();if(selected)await open(selected,true);}catch(e){tell(e.message);}})();
setInterval(async()=>{if(document.hidden||busy)return;try{await refreshList();if(current){const t=await api(`/api/messages/${encodeURIComponent(current)}`);renderThread(t);await api(`/api/messages/${encodeURIComponent(current)}/seen`,{});}}catch{/* Keep current messages and draft intact while offline. */}},20000);
