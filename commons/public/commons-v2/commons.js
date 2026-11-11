'use strict';
const toggle=document.getElementById('menu-toggle');const nav=document.getElementById('nav');
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
nav?.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false')}});
