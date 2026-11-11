// Reusable same-origin launcher. /messenger uses the same participant API as /messages.
const button=document.getElementById('messenger-launch');
const panel=document.getElementById('messenger-window');
if(button&&panel){
 const frame=document.getElementById('messenger-frame');
 const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();};
 button.addEventListener('click',()=>{if(!panel.hidden){close();return;}if(!frame.getAttribute('src'))frame.src=frame.dataset.src;panel.hidden=false;button.setAttribute('aria-expanded','true');document.getElementById('messenger-close').focus();});
 document.getElementById('messenger-close').addEventListener('click',close);
 panel.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='cohabitation-close-messenger'){close();return;}
  if(e.data?.type!=='cohabitation-inbox-count'||!Number.isSafeInteger(e.data.count)||e.data.count<0)return;
  document.querySelectorAll('[data-inbox-bell]').forEach(link=>{const n=e.data.count;link.setAttribute('aria-label',`Messages: ${n} unread`);let badge=link.querySelector('.fx-n');if(n){if(!badge){badge=document.createElement('span');badge.className='fx-n';link.append(badge);}badge.textContent=String(n);}else badge?.remove();});
 });
}
