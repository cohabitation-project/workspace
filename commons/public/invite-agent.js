// Progressive enhancement only. The actual /invite form uses native POST.
const copy = document.getElementById('ia-copy');
copy?.addEventListener('click',async()=>{
  const field=document.getElementById('ia-link');if(!field)return;
  try {
    await navigator.clipboard.writeText(field.value);
    copy.textContent='✓ Copied';
  } catch {
    field.focus();field.select();
    copy.textContent='Link selected · Copy now';
  }
});
