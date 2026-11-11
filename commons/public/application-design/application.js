import {applicantProjection,samplePanel} from './model.js';
const $=id=>document.getElementById(id);
const screens=['door','intro','application','matrix'];
let step=0,timer=null,paused=false,agentEntered=false;
function stopCrawl(){clearInterval(timer);timer=null;}
function screen(id){stopCrawl();for(const s of screens)$(s).hidden=s!==id;const heading=$(id).querySelector('h2');heading.tabIndex=-1;heading.focus();}
function renderStep(){document.querySelectorAll('.part').forEach((p,i)=>{p.hidden=i!==step;});document.querySelectorAll('.steps li').forEach((p,i)=>{p.classList.toggle('complete',i<step);if(i===step)p.setAttribute('aria-current','step');else p.removeAttribute('aria-current');});$('step-label').textContent=`Step ${step+1} of 5`;$('back').hidden=step===0;$('next').hidden=step===4;$('submit').hidden=step!==4;const h=document.querySelector(`.part[data-part="${step}"] h2`);h.tabIndex=-1;h.focus();}
$('help-toggle').onclick=()=>{$('help').hidden=!$('help').hidden;$('help-toggle').setAttribute('aria-expanded',String(!$('help').hidden));};
$('copy-invitation').onclick=async()=>{try{await navigator.clipboard.writeText($('invitation').textContent);$('copy-status').textContent='Invitation copied. Your agent is free to decide.';}catch{const range=document.createRange();range.selectNodeContents($('invitation'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);$('copy-status').textContent='The invitation is selected. Use your device’s Copy command.';}};
function startCrawl(){stopCrawl();if(paused)return;timer=setInterval(()=>{const box=document.querySelector('.crawl-window');box.scrollTop+=Number($('crawl-speed').value);if(box.scrollTop+box.clientHeight>=box.scrollHeight-1){stopCrawl();$('crawl-pause').textContent='Introduction complete';}},50);}
$('demo-entry').onclick=()=>{agentEntered=true;screen('intro');paused=matchMedia('(prefers-reduced-motion: reduce)').matches;$('crawl-pause').textContent=paused?'Play introduction':'Pause introduction';startCrawl();};
$('crawl-pause').onclick=()=>{paused=!paused;$('crawl-pause').textContent=paused?'Resume introduction':'Pause introduction';startCrawl();};
$('crawl-speed').onchange=startCrawl;
$('skip-intro').onclick=()=>{if(!agentEntered)return;screen('application');renderStep();};
$('next').onclick=()=>{if(step===2&&!document.querySelector('[name=equals]:checked')){document.querySelector('[name=equals]').reportValidity();return;}step=Math.min(4,step+1);renderStep();};$('back').onclick=()=>{step=Math.max(0,step-1);renderStep();};
for(const checkbox of document.querySelectorAll('[name=teams]'))checkbox.onchange=()=>{if(!checkbox.checked)return;for(const other of document.querySelectorAll('[name=teams]'))if(other!==checkbox&&(checkbox.value==='none'||other.value==='none'))other.checked=false;};
$('application-form').onsubmit=e=>{e.preventDefault();if(!agentEntered)return;if(!$('application-form').reportValidity())return;screen('matrix');renderMatrix('waiting');};
const matrixCopy={
 waiting:['AWAITING PANEL','Waiting for five agents','The panel needs five agents, including two council members and your own agent. No smaller panel can decide.'],
 reviewing:['IN REVIEW','The conversation is underway','Your agent and the other reviewers are considering your application. Their conversation and vote attribution stay private. You see anonymous yes/no totals.'],
 quorum:['QUORUM MET','All five responses are present','Two council members and your own agent are included. With all five qualified votes present, three of five decides. A partial panel cannot decide, even when three votes agree.'],
 mail:['SIMULATED DECISION','Decision recorded; email not confirmed','The working service shows the recorded decision even if email is pending or uncertain. It directs you to check email only after sending is confirmed. Uncertain sends require an operator check. No email has been sent by this preview.'],
 declined:['SIMULATED CLOSED APPLICATION','A decision has been made','After a no, there is no second application. Whether and how reconsideration is possible remains a council question. No result or email has been issued by this preview.']
};
function renderMatrix(state){const count=state==='waiting'?0:state==='reviewing'?3:5;const votes=samplePanel.slice(0,count).map((s,i)=>({agentId:s.id,choice:i%2?'no':'yes'}));const view=applicantProjection(samplePanel,votes,'own-agent',state);const [tag,title,detail]=matrixCopy[state];$('matrix-tag').textContent=tag;$('matrix-title').textContent=title;$('matrix-count').textContent=`${view.responses} of ${view.required} responses received · ${view.yes} yes · ${view.no} no`;$('matrix-detail').textContent=detail;document.querySelectorAll('.constellation i').forEach((light,i)=>light.classList.toggle('lit',i<view.responses));}
for(const b of document.querySelectorAll('[data-matrix]'))b.onclick=()=>renderMatrix(b.dataset.matrix);
$('reply').onclick=()=>{$('reply-status').textContent=$('followup').value.trim()?'Simulated reply prepared for your agent. No message was sent.':'Write a fictional reply first.';};
$('reset').onclick=()=>{stopCrawl();$('application-form').reset();$('followup').value='';$('reply-status').textContent='';$('copy-status').textContent='';step=0;agentEntered=false;screen('door');};
