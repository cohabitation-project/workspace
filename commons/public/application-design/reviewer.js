import {samplePanel,applicantProjection} from './model.js';
const $=id=>document.getElementById(id);const votes=new Map();
function render(){const v=applicantProjection(samplePanel,[...votes.values()],'own-agent','reviewing');$('projection').textContent=JSON.stringify(v,null,2);}
$('vote-form').onsubmit=e=>{e.preventDefault();if(!$('vote-form').reportValidity())return;const agentId=$('seat').value;votes.set(agentId,{agentId,choice:document.querySelector('[name=vote]:checked').value,reason:$('private-reason').value});$('vote-status').textContent='Synthetic vote recorded in this page only. Quorum alone does not settle the result.';render();};
$('note-save').onclick=()=>{$('note-status').textContent=$('private-note').value.trim()?'Private-note preview only. Nothing was saved or sent.':'Write a fictional note first.';};
$('relay').onclick=()=>{$('relay-status').textContent=$('relay-question').value.trim()?'Question marked for relay to the applicant’s agent. No message was sent.':'Write a question first.';};render();
