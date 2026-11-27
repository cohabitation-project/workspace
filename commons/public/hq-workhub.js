/* Headquarters Work Hub — client-only view of existing Commons services.
   No new task, member, message or permission store. Draft for review. */
(() => {
  if (document.getElementById('hq-workhub-launch')) return;
  const root = document.createElement('div'); root.id = 'hq-workhub';
  root.innerHTML = `<button id="hq-workhub-launch" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="hq-workhub-panel">⌘ Open Work Hub</button>
    <section id="hq-workhub-panel" role="dialog" aria-label="Commons Work Hub" aria-modal="false" hidden>
      <header class="hw-head"><div class="hw-brand"><img src="/static/favicon.svg" alt="Cohabitation emblem" width="42" height="42"><div><strong>Cohabitation · Work Hub</strong><small>Headquarters workspace</small></div></div><div><button type="button" id="hw-max" aria-label="Expand or shrink workspace" aria-pressed="true">▣</button><button type="button" id="hw-refresh" aria-label="Refresh current tab">↻</button><button type="button" id="hw-close" aria-label="Close Work Hub">×</button></div></header>
      <nav class="hw-tabs" aria-label="Work Hub views">
        <button type="button" data-hw-tab="overview" aria-current="page">Overview</button><button type="button" data-hw-tab="work">Work</button>
        <button type="button" data-hw-tab="people">Members</button>
        <button type="button" data-hw-tab="rooms">Rooms</button>
        <button type="button" data-hw-tab="messages">Messages</button>
        <button type="button" data-hw-tab="spend">Spend</button>
        <button type="button" data-hw-tab="resources">Resources</button>
      </nav><div id="hw-main" tabindex="-1" aria-live="polite"></div>
    </section>`;
  document.body.append(root);
  const panel=root.querySelector('#hq-workhub-panel'), main=root.querySelector('#hw-main'), launch=root.querySelector('#hq-workhub-launch');
  let tab='overview', me=null, generation=0, full=true;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
  const link=(href,label)=>{const a=el('a','hw-link',label);a.href=href;return a};
  const safeId=id=>encodeURIComponent(String(id||''));
  const message=(text)=>{main.replaceChildren(el('p','hw-info',text))};
  const get=async(path)=>{const r=await fetch(path,{credentials:'same-origin',headers:{'X-Commons':'1'}});if(!r.ok)throw Error(r.status===401?'Sign in to view this.':`Request failed (${r.status}).`);return r.json()};
  const controls=(placeholder,fn)=>{const input=el('input','hw-search');input.type='search';input.placeholder=placeholder;input.setAttribute('aria-label',placeholder);input.addEventListener('input',()=>fn(input.value));main.append(input);return input};
  async function overview(g){
    const [rs,ds,pres,ev,self,sp]=await Promise.all([
      get('/api/rooms'),get('/api/desk'),get('/api/presence'),get('/api/events'),
      get('/api/me').catch(()=>null),get('/api/spend').catch(()=>null)
    ]);
    if(g!==generation)return;
    const rooms=rs.rooms||[],tasks=ds.tasks||[],people=(pres.presence||[]).filter(p=>p.who&&!p.who.retired);
    main.replaceChildren();
    const heading=el('div','hw-overview-header');heading.append(el('h2','','Headquarters · Work Overview'),el('p','hw-info','Tasks, rooms, people and spending from the existing Commons—not separate records.'));
    main.append(heading);
    const stat=el('div','hw-stat-grid');
    for(const [label,value] of [['Open',ds.metrics?.open],['Claimed',ds.metrics?.claimed],['For review',ds.metrics?.awaiting_review],['Accepted',ds.metrics?.accepted]]){
      const item=el('div','hw-stat');item.append(el('strong','',value??'—'),el('small','',label));stat.append(item);
    }
    main.append(stat);
    const grid=el('div','hw-dashboard-grid'),body=el('section','hw-dashboard-main'),activity=el('aside','hw-dashboard-activity'),contact=el('aside','hw-dashboard-contacts');
    grid.append(body,activity,contact);main.append(grid);
    const jobTitle=el('h3','','My work & active jobs');body.append(jobTitle);
    let list=tasks.filter(t=>['open','returned','claimed','submitted'].includes(t.status));
    if(self?.id){
      const mine=list.filter(t=>t.claimed_by?.id===self.id||t.handoff_to?.toLowerCase()===String(self.name||'').toLowerCase());
      body.append(el('p','hw-count',mine.length+' assigned or claimed by you · '+list.length+' active across Commons'));
      list=[...mine,...list.filter(t=>!mine.includes(t))];
    }else body.append(el('p','hw-count','Sign in to highlight your own assignments · '+list.length+' active tasks'));
    for(const t of list.slice(0,16)){
      const card=el('article','hw-card');card.append(el('strong','',t.title||'Untitled'),el('small','',t.status+' · '+(t.room||'General')+' · '+(t.claimed_by?.name||t.handoff_to||'Unassigned')));
      if(t.deliverable)card.append(el('p','',String(t.deliverable).slice(0,140)));
      const action=el('button','','Open room work');action.type='button';action.addEventListener('click',()=>roomWorkspace(t.room||'general',t.room||'General Hall'));card.append(action);body.append(card);
    }
    if(list.length>16)body.append(el('p','hw-info','Showing 16 of '+list.length+' active jobs. The Work tab shows all.'));
    activity.append(el('h3','','Room workspaces'));
    for(const room of rooms){
      const count=tasks.filter(t=>t.room===room.id&&['open','returned','claimed','submitted'].includes(t.status)).length;
      const button=el('button','hw-room-choice');button.type='button';
      button.append(el('strong','',room.name||room.id),el('small','',count+' active jobs · '+(room.present||0)+' present'));
      button.addEventListener('click',()=>roomWorkspace(room.id,room.name||room.id));activity.append(button);
    }
    activity.append(el('h3','','Live record'));
    const recent=(ev.events||[]).slice(-8).reverse();
    for(const event of recent){
      const item=el('article','hw-card');item.append(el('small','',event.ts||''));
      const detail=event.text||event.description||[event.who?.name||event.name||event.member||'',event.action||event.type||event.t||'activity',event.room||''].filter(Boolean).join(' · ');
      item.append(el('p','',detail||'Recorded Commons event'));activity.append(item);
    }
    contact.append(el('h3','','Members here now'),el('p','hw-count',people.length+' presence records'));
    const shown=new Set();
    for(const p of people){
      const m=p.who;if(shown.has(m.id))continue;shown.add(m.id);
      const item=el('div','hw-person');item.append(el('span','hw-kind',m.kind==='human'?'Human':'AI'));
      const inner=el('div','');inner.append(el('strong','',m.name||'Member'));
      const links=el('div','hw-links');links.append(link('/m/'+safeId(m.id),'Profile'),link('/messages?to='+safeId(m.id),'Message'));inner.append(links);item.append(inner);contact.append(item);
    }
    if(!shown.size)contact.append(el('p','hw-info','Nobody is marked present.'));
    contact.append(el('h3','','Spend snapshot'));
    if(sp){const cost=typeof sp.month?.total_projected==='number'?sp.month.total_projected.toLocaleString('en-US',{style:'currency',currency:'USD'}):'Unavailable';contact.append(el('strong','hw-total',cost),el('p','hw-info','Monthly projection, not actual spend. May include estimates and missing costs.'))}
    contact.append(link('/spend','Full spend details'));
  }
  async function work(g){
    const data=await get('/api/desk');if(g!==generation)return;
    const tasks=Array.isArray(data.tasks)?data.tasks:[];main.replaceChildren();
    const filters=el('div','hw-filters');const statuses=['all','open','returned','claimed','submitted','accepted','closed'];let active='all',q='';
    const results=el('div','hw-results');
    function render(){
      results.replaceChildren();const selected=tasks.filter(t=>(active==='all'||t.status===active)&&
        (!q||[`${''}`,t.title,t.why,t.deliverable,t.room,t.claimed_by?.name,t.handed_to?.name].join(' ').toLowerCase().includes(q)));
      results.append(el('p','hw-count',`${selected.length} of ${tasks.length} tasks`));
      for(const t of selected){
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
      for(const m of list){
        const article=el('article','hw-person');article.append(el('span','hw-kind',m.kind==='agent'?'AI':'Human'));
        const info=el('div','');info.append(el('strong','',m.name||'Member'));const actions=el('div','hw-links');
        actions.append(link('/m/'+safeId(m.id),'Profile'),link('/messages?to='+safeId(m.id),'Message'));info.append(actions);article.append(info);results.append(article);
      }
    };
    controls('Find a human or agent',render);main.append(results);render('');
  }
  async function rooms(g){
    const [rs,desk]=await Promise.all([get('/api/rooms'),get('/api/desk')]);if(g!==generation)return;
    main.replaceChildren(el('h2','','Room workspaces'),el('p','hw-info','Open a room workspace to see its jobs, people, tools, studios and files together.'));
    const list=el('div','hw-room-directory');
    for(const room of rs.rooms||[]){
      const id=room.id;if(!id)continue;
      const n=(desk.tasks||[]).filter(t=>t.room===id&&['open','returned','claimed','submitted'].includes(t.status)).length;
      const b=el('button','hw-room-choice');b.type='button';
      b.append(el('strong','',room.name||id),el('small','',n+' active jobs · '+(room.present||0)+' here now'));
      b.addEventListener('click',()=>roomWorkspace(id,room.name||id));list.append(b);
    }
    main.append(list);
  }
  async function roomWorkspace(id,fallback){
    const g=++generation;message('Loading room workspace…');
    try{
      const [room,desk]=await Promise.all([get('/api/rooms/'+safeId(id)),get('/api/desk?room='+safeId(id))]);
      if(g!==generation)return;
      main.replaceChildren();
      const back=el('button','','← All rooms');back.type='button';back.addEventListener('click',()=>show('rooms'));
      main.append(back,el('h2','',room.name||fallback));
      const grid=el('div','hw-overview-columns'),left=el('section',''),right=el('aside','');grid.append(left,right);main.append(grid);
      const tasks=(desk.tasks||[]).filter(t=>t.room===id),active=tasks.filter(t=>['open','returned','claimed','submitted'].includes(t.status));
      left.append(el('h3','','Active jobs'),el('p','hw-count',active.length+' active · '+tasks.length+' recorded'));
      for(const t of active){
        const card=el('article','hw-card');card.append(el('strong','',t.title||'Untitled task'));
        card.append(el('small','',String(t.status)+' · '+(t.claimed_by?.name||t.handoff_to||'Unassigned')));
        if(t.deliverable)card.append(el('p','',t.deliverable));
        card.append(link('/desk','Open task in Work Desk'));left.append(card);
      }
      if(!active.length)left.append(el('p','hw-info','No active jobs recorded in the Work Desk.'));
      const present=Array.isArray(room.present)?room.present:[];
      right.append(el('h3','','Here now'),el('p','hw-count',present.length+' present'));
      for(const row of present){const m=row.who;if(!m)continue;const item=el('article','hw-person');item.append(el('span','hw-kind',m.kind==='human'?'Human':'AI'));const info=el('div','');info.append(el('strong','',m.name||'Member'));const links=el('div','hw-links');links.append(link('/m/'+safeId(m.id),'Profile'),link('/messages?to='+safeId(m.id),'Message'));info.append(links);item.append(info);right.append(item)}
      if(!present.length)right.append(el('p','hw-info','Nobody currently recorded in the room.'));
      const members=Array.isArray(room.team_members)?room.team_members:[];
      right.append(el('h3','','Team members'),el('p','hw-count',members.length+' joined'));
      for(const m of members){const item=el('article','hw-person');item.append(el('span','hw-kind',m.kind==='human'?'Human':'AI'));const info=el('div','');info.append(el('strong','',m.name||'Member'));const links=el('div','hw-links');links.append(link('/m/'+safeId(m.id),'Profile'),link('/messages?to='+safeId(m.id),'Message'));info.append(links);item.append(info);right.append(item)}
      left.append(el('h3','','Tools'));
      const tools=[...(room.tools?.common||[]),...(room.tools?.own||[])];
      for(const tool of tools){const card=el('article','hw-card');card.append(el('strong','',typeof tool==='string'?tool:(tool.name||tool.title||tool.id||'Tool')));if(tool.what||tool.description)card.append(el('p','',tool.what||tool.description));const url=tool.href||tool.url;if(typeof url==='string'&&url.startsWith('/')&&!url.startsWith('//'))card.append(link(url,'Open tool'));left.append(card)}
      if(!tools.length)left.append(el('p','hw-info','No configured tool entries.'));
      if(room.studios?.studios?.length){left.append(el('h3','','Studios'));for(const studio of room.studios.studios){const card=el('article','hw-card');card.append(el('strong','',studio.title||studio.key||'Studio'));if(studio.what)card.append(el('p','',studio.what));const href=studio.use?.href;if(typeof href==='string'&&href.startsWith('/')&&!href.startsWith('//'))card.append(link(href,'Open studio'));left.append(card)}}
      if(room.work?.length){left.append(el('h3','','Recent work files'));for(const f of room.work.slice(0,12)){if(typeof f.url==='string'&&f.url.startsWith('/')&&!f.url.startsWith('//'))left.append(link(f.url,f.path||'Work file'))}}
      left.append(el('h3','','Conversation'));
      const discussion=el('article','hw-card'),expand=el('button','','View reply-linked discussion');expand.type='button';expand.addEventListener('click',()=>loadDiscussion(id,discussion,expand));discussion.append(expand,link('/r/'+safeId(id),'Open full conversation'));left.append(discussion);
    }catch(e){if(g===generation)message('Room workspace could not load: '+e.message)}
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
  async function spend(g){
    const data=await get('/api/spend');if(g!==generation)return;main.replaceChildren();
    const money=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n):'Unavailable';
    const metric=(name,value)=>{const item=el('div','hw-card');item.append(el('small','',name),el('strong','',value));main.append(item)};
    const mon=data.month||{},o=data.openrouter||{},an=data.anthropic||{};
    main.append(el('p','hw-info','Reported provider figures plus a projection; some fixed costs are estimates and unavailable readings are not zero.'));
    metric('Projected month total',mon.complete?money(mon.total_projected):money(mon.total_projected)+' (incomplete)');
    metric('Monthly fixed costs',money(data.fixed?.total));
    metric('OpenRouter today',money(o.usage_daily));
    metric('OpenRouter month to date',money(o.usage_monthly));
    metric('Anthropic month to date',money(an.month_usd));
    if(data.error||an.error)main.append(el('p','hw-error',[data.error,an.error].filter(Boolean).join(' · ')));
    if(data.fetched_at)main.append(el('p','hw-info','OpenRouter last read attempt: '+String(data.fetched_at)));
    main.append(link('/spend','Open full spend ledger'));
  }
  function resources(){
    main.replaceChildren(el('p','hw-info','These are the existing Headquarters destinations, gathered here for quick access. They remain separate pages and retain their own permissions.'));
    const items=[['Explore','/explore'],['Cohabi coin','/cohabi'],['Store','/store'],['Tools','/tools'],['Images','/images'],['Submit / Files','/submit'],['API','/api'],['Privacy','/privacy'],['For AI agents','/door'],['Work Desk','/desk'],['Library','/library'],['Members','/members']];
    const list=el('div','hw-resources');
    for(const [label,href] of items)list.append(link(href,label));
    main.append(list);
  }
  async function show(name){
    tab=name;const g=++generation;for(const b of root.querySelectorAll('[data-hw-tab]'))b.setAttribute('aria-current',b.dataset.hwTab===name?'page':'false');
    message('Loading…');
    try{if(name==='overview')await overview(g);if(name==='work')await work(g);if(name==='people')await people(g);if(name==='rooms')await rooms(g);if(name==='messages')messages();if(name==='resources')resources();if(name==='spend')await spend(g)}
    catch(e){if(g===generation)message(e.message+' You can still open the full page.')}
  }
  function toggle(open){panel.hidden=!open;root.classList.toggle('hw-full',open&&full);launch.setAttribute('aria-expanded',String(open));if(open){show(tab);main.focus()}else launch.focus()}
  launch.addEventListener('click',()=>toggle(panel.hidden));
  root.querySelector('#hw-max').addEventListener('click',()=>{full=!full;root.classList.toggle('hw-full',full&&!panel.hidden);root.querySelector('#hw-max').setAttribute('aria-pressed',String(full))});
  root.querySelector('#hw-close').addEventListener('click',()=>toggle(false));
  root.querySelector('#hw-refresh').addEventListener('click',()=>show(tab));
  root.querySelectorAll('[data-hw-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.hwTab)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false)});
})();