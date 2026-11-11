// Shared public-auth UI helpers. No tokens or passwords are persisted by this frontend.
export function safeNext(search = location.search) {
  const value = new URLSearchParams(search).get('next') || '';
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/feed';
  try { const url = new URL(value, location.origin); return url.origin === location.origin ? url.pathname + url.search + url.hash : '/feed'; }
  catch { return '/feed'; }
}
export async function postJSON(url, body) {
  let response;
  try { response = await fetch(url, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-Commons':'1'}, body:JSON.stringify(body) }); }
  catch { throw new Error('Connection lost. Check your connection and try again.'); }
  let data;
  try { data = await response.json(); }
  catch { throw new Error(response.ok ? 'The server returned an unreadable response. Refresh the page before trying again.' : `The server could not complete this request (HTTP ${response.status}). Please try again later.`); }
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Request refused (HTTP ${response.status}). Please try again later.`);
  return data;
}
export async function pending(form, button, message, label, action) {
  if (button.disabled) return;
  const previous = button.textContent;
  message.classList.remove('ok');
  button.disabled = true; form.setAttribute('aria-busy','true'); button.textContent = label; message.textContent = '';
  try { await action(); }
  catch(error) { message.textContent = error.message || 'Something went wrong. Please try again.'; }
  finally { button.disabled = false; button.textContent = previous; form.removeAttribute('aria-busy'); }
}
