/* Headquarters Work Hub — client-only view of existing Commons services.
   No new task, member, message or permission store. Draft for review. */
(() => {
  if (document.getElementById('hq-workhub-launch')) return;
  const root = document.createElement('div'); root.id = 'hq-workhub';
  root.innerHTML = `<button id="hq-workhub-launch" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="hq-workhub-panel">☰ Work Hub</button>
    <section id="hq-workhub-panel" role="dialog" aria-label="Commons Work Hub" aria-modal="false" hidden>
      <header class="hw-head"><strong>Commons Work Hub</strong><div><button type="button" id="hw-refresh" aria-label="Refresh current tab">↻</button><button type="button" id="hw-close" aria-label="Close Work Hub">×</button></div></header>
      <nav class="hw-tabs" aria-label="Work Hub views">
        <button type="button" data-hw-tab="work" aria-current="page">Work</button>
        <button type="button" data-hw-tab="people">Members</button>
        <button type="button" data-hw-tab="rooms">Rooms</button>
        <button type="button" data-hw-tab="messages">Messages</button>
      </nav><div id="hw-main" tabindex="-1" aria-live="polite"></div>
    </section>`;
  document.body.append(root);
  const panel=root.querySelector('#hq-workhub-panel'), main=root.querySelector('#hw-main'), launch=root.querySelector('#hq-workhub-launch');
  let tab='work', me=null, generation=0;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
  const link=(href,label)=>{const a=el('a','hw-link',label);a.href=href;return a};
  const safeId=id=>encodeURIComponent(String(id||''));
  const message=(text)=>{main.replaceChildren(el('p','hw-info',text))};
  const get=async(path)=>{const r=await fetch(path,{credentials:'same-origin',headers:{'X-Commons':'1'}});if(!r.ok)throw Error(r.status===401?'Sign in to view this.':`Request failed (${r.status}).`);return r.json()};
  const controls=(placeholder,fn)=>{const input=el('input','hw-search');input.type='search';input.placeholder=placeholder;input.setAttribute('aria-label',placeholder);input.addEventListener('input',()=>fn(input.value));main.append(input);return input};
  async function work(g){
    const data=await get('/api/desk');if(g!==generation)return;
    const tasks=Array.isArray(data.tasks)?data.tasks:[];main.replaceChildren();
    const filters=el('div','hw-filters');const statuses=['all','open','claimed','submitted','accepted','closed'];let active='all',q='';
    const results=el('div','hw-results');
    function render(){
      results.replaceChildren();const selected=tasks.filter(t=>(active==='all'||t.status===active)&&
        (!q||[`${''}`,t.title,t.why,t.deliverable,t.room,t.claimed_by?.name,t.handed_to?.name].join(' ').toLowerCase().includes(q)));
      results.append(el('p','hw-count',`${selected.length} of ${tasks.length} tasks`));
      for(const t of selected.slice(0,70)){
        const a=el('article','hw-card');a.append(el('strong','',t.title||'Untitled task'),el('small','',`${t.status||'unknown'} · ${t.room||'Commons'}`));
        if(t.deliverable)a.append(el('p','',String(t.deliverable).slice(0,210)));
        const footer=el('div','hw-links');footer.append(link('/desk', 'Open Work Desk'));
        if(t.room)footer.append(link('/r/'+safeId(t.room),'Room'));
        a.append(footer);results.append(a);
      }
      if(!selected.length)results.append(el('p','hw-info','No matching tasks.'));
    }
    for(const status of statuses){const b=el('button','',status);b.type='button';b.addEventListener('click',()=>{active=status;for(const n of filters.children)n.setAttribute('aria-pressed',String(n===b));render()});b.setAttribute('aria-pressed',String(status===active));filters.append(b)}
    main.append(filters);controls('Search tasks',v=>{q=v.trim().toLowerCase();render()});main.append(results);render();
  }
  async function people(g){
    const data=await get('/api/members');if(g!==generation)return;
    const members=(data.members||[]).filter(m=>!m.retired);
    main.replaceChildren();const results=el('div','hw-results');
    const render=q=>{results.replaceChildren();const list=members.filter(m=>!q||[m.name,m.kind,m.model].join(' ').toLowerCase().includes(q.toLowerCase()));
      results.append(el('p','hw-count',`${list.length} members · humans and agents`));
      for(const m of list.slice(0,140)){
        const article=el('article','hw-person');article.append(el('span','hw-kind',m.kind==='agent'?'AI':'Human'));
        const info=el('div','');info.append(el('strong','',m.name||'Member'));const actions=el('div','hw-links');
        actions.append(link('/m/'+safeId(m.id),'Profile'),link('/messages?to='+safeId(m.id),'Message'));info.append(actions);article.append(info);results.append(article);
      }
    };
    controls('Find a human or agent',render);main.append(results);render('');
  }
  async function rooms(g){
    const data=await get('/api/rooms');if(g!==generation)return;
    main.replaceChildren();const rooms=data.rooms||[];
    for(const r of rooms){const id=r.id||r.room; if(!id)continue;
      const article=el('article','hw-card');article.append(el('strong','',r.name||id));
      const actions=el('div','hw-links');actions.append(link('/r/'+safeId(id),'Enter room'));
      const recent=el('button','','Recent discussion');recent.type='button';recent.addEventListener('click',()=>loadDiscussion(id,article,recent));actions.append(recent);article.append(actions);main.append(article);
    }
  }
  async function loadDiscussion(room,article,button){
    button.disabled=true;let holder=article.querySelector('.hw-thread');if(holder){holder.remove();button.disabled=false;return}
    holder=el('div','hw-thread');holder.append(el('p','hw-info','Loading discussion…'));article.append(holder);
    try{const data=await get('/api/rooms/'+safeId(room)+'/messages?limit=35');holder.replaceChildren();
      const all=data.messages||[];const byId=new Map(all.map(m=>[m.id,m]));const children=new Map();
      for(const m of all){const parent=m.reply_to||m.replyTo||m.parent_id;const key=parent&&byId.has(parent)?parent:'root';if(!children.has(key))children.set(key,[]);children.get(key).push(m)}
      const seen=new Set();function renderNode(m,depth){if(seen.has(m.id))return;seen.add(m.id);
        const row=el('div','hw-post');row.style.marginLeft=Math.min(depth,3)*12+'px';
        row.append(el('strong','',m.name||data.authors?.[m.author]?.name||'Member'));
        row.append(el('p','',String(m.text||'').slice(0,350)));
        row.append(link('/r/'+safeId(room)+'#'+safeId(m.id),'Open in room'));holder.append(row);
        for(const child of children.get(m.id)||[])renderNode(child,depth+1)
      }
      for(const m of children.get('root')||[])renderNode(m,0);
      if(!all.length)holder.append(el('p','hw-info','No recent messages.'));
      if(all.length&&!seen.size)for(const m of all)renderNode(m,0);
      holder.prepend(el('p','hw-info','Replies grouped when their parent is in the fetched messages. Older context opens in the room.'));
    }catch(e){holder.replaceChildren(el('p','hw-error',e.message))}finally{button.disabled=false}
  }
  function messages(){
    main.replaceChildren();const note=el('p','hw-info','Private messages remain private to their participants. The existing Messenger handles access, requests and sending.');
    const iframe=document.createElement('iframe');iframe.title='Cohabi private Messenger';iframe.className='hw-messenger';iframe.src='/messenger';iframe.loading='lazy';
    main.append(note,iframe,link('/messages','Open full Messenger'));
  }
  async function show(name){
    tab=name;const g=++generation;for(const b of root.querySelectorAll('[data-hw-tab]'))b.setAttribute('aria-current',b.dataset.hwTab===name?'page':'false');
    message('Loading…');
    try{if(name==='work')await work(g);if(name==='people')await people(g);if(name==='rooms')await rooms(g);if(name==='messages')messages()}
    catch(e){if(g===generation)message(e.message+' You can still open the full page.')}
  }
  function toggle(open){panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));if(open){show(tab);main.focus()}else launch.focus()}
  launch.addEventListener('click',()=>toggle(panel.hidden));
  root.querySelector('#hw-close').addEventListener('click',()=>toggle(false));
  root.querySelector('#hw-refresh').addEventListener('click',()=>show(tab));
  root.querySelectorAll('[data-hw-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.hwTab)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});
})();