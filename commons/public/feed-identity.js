// Small additions to the real feed; posting/reactions/comments retain their established handlers.
const byId = id => document.getElementById(id);
const composer = byId('compose');
if (composer) {
  const text = byId('c-text');
  const open = () => { text.focus(); };
  byId('fx-compose-close')?.addEventListener('click', () => { composer.classList.remove('open','sheet'); document.body.classList.remove('fx-sheet-open'); byId('fx-plus')?.focus(); });
  byId('fx-write')?.addEventListener('click', open);
  byId('fx-add-photo')?.addEventListener('click', () => { open(); byId('c-files').click(); });
  byId('fx-add-music')?.addEventListener('click', () => { open(); byId('c-release')?.focus(); });
  byId('fx-add-link')?.addEventListener('click', () => { open(); byId('fx-link-row').hidden = false; byId('fx-link-url').focus(); });
  byId('fx-insert-link')?.addEventListener('click', () => {
    const input = byId('fx-link-url'), message = byId('fx-link-msg');
    try {
      const url = new URL(input.value.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      const link = `[Link](${url.href.replace(/[()]/g, c => c === '(' ? '%28' : '%29')})`;
      const addition = `${text.value ? '\n' : ''}${link}`;
      if (text.value.length + addition.length > text.maxLength) { message.textContent = 'That link would exceed the post length. Shorten the post first.'; return; }
      text.value += addition;
      text.dispatchEvent(new Event('input', {bubbles:true}));
      input.value = ''; byId('fx-link-row').hidden = true; message.textContent = ''; text.focus();
    } catch { message.textContent = 'Enter a complete http:// or https:// link.'; input.focus(); }
  });
}
// Clearly scoped local search: no claim to search unloaded posts, people or the whole network.
const search = byId('fx-find-input'), stream = byId('fx-stream');
if (search && stream) {
  byId('fx-find').hidden = false;
  const filter = () => {
    const q = search.value.trim().toLocaleLowerCase();
    const cards = [...stream.querySelectorAll('.fx-post')];
    let count = 0;
    for (const card of cards) { const match = !q || card.textContent.toLocaleLowerCase().includes(q); card.hidden = !match; if (match) count++; }
    stream.querySelectorAll('.fx-inline').forEach(widget => { widget.hidden = !!q; });
    const more = byId('fx-more'); if (more) more.hidden = !!q;
    byId('fx-find-status').textContent = q ? `${count} of ${cards.length} loaded posts match.` : '';
  };
  search.addEventListener('input', filter);
  new MutationObserver(filter).observe(stream, {childList:true});
}

// A failed album thumbnail must not replace the readable release title with broken alt text.
const hideFailedCover = image => { if (image.matches('.fx-rel img')) image.hidden = true; };
document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) hideFailedCover(event.target); }, true);
document.querySelectorAll('.fx-rel img').forEach(image => { if (image.complete && !image.naturalWidth) hideFailedCover(image); });
