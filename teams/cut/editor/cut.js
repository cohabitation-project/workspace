// Cohabi Cut Job 4 editor screen prototype. No server render route is wired yet.
// The edit payload deliberately contains only the fields consumed by editToTracks.

const DRAFT_PREFIX = 'cohabi-cut-draft:';
const DEFAULT_VOLUME = 0.7;
const Y_BY_POSITION = Object.freeze({ top: -540, middle: 0, bottom: 540 });

export function buildEdit({ trimStart, trimEnd, textBody = '', textPosition = 'middle', musicId = '', musicVolume = DEFAULT_VOLUME, coverSec }) {
  const edit = { trimStart: Number(trimStart), trimEnd: Number(trimEnd) };
  const body = String(textBody);
  if (body.length > 80 || /[\r\n]/.test(body)) throw new RangeError('Text must be one line of at most 80 characters.');
  if (body.trim()) {
    if (!Object.hasOwn(Y_BY_POSITION, textPosition)) throw new RangeError('Choose top, middle, or bottom for text.');
    edit.text = { body, y: Y_BY_POSITION[textPosition] };
  }
  if (musicId) edit.music = { id: String(musicId), volume: Number(musicVolume) };
  edit.coverSec = Number(coverSec);
  return edit;
}

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* draft remains usable in this page */ }
}

function showToast(message) {
  const toast = document.querySelector('.rl-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 5000);
}

function trackLabel(track) {
  return String(track?.title ?? track?.name ?? track?.label ?? 'Untitled track');
}

async function loadMusic(select, wrapper, selectedId = '') {
  try {
    const response = await fetch('/api/label/tracks', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const payload = await response.json();
    const tracks = Array.isArray(payload) ? payload : (Array.isArray(payload?.tracks) ? payload.tracks : []);
    for (const track of tracks) {
      if (!track || typeof track.id !== 'string' || !track.id) continue;
      const option = document.createElement('option');
      option.value = track.id;
      option.textContent = trackLabel(track);
      select.append(option);
    }
    if (select.options.length > 1) wrapper.hidden = false;
    if (selectedId) select.value = selectedId;
  } catch { /* the optional library is unavailable; keep its control hidden */ }
}

function stockDuration(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return 'Duration unknown';
  const total = Math.round(Number(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} (${total} seconds)`;
}

function renderStockResults(container, hits, onChoose) {
  container.replaceChildren();
  if (!Array.isArray(hits) || hits.length === 0) return 0;
  for (const hit of hits) {
    if (!hit || (typeof hit.id !== 'string' && typeof hit.id !== 'number')) continue;
    const card = document.createElement('article');
    card.className = 'stock-result';
    const image = document.createElement('img');
    image.alt = '';
    image.loading = 'lazy';
    if (typeof hit.thumb === 'string' && hit.thumb) image.src = hit.thumb;
    card.append(image);
    const details = document.createElement('div');
    const duration = document.createElement('p');
    duration.textContent = stockDuration(hit.seconds);
    const credit = document.createElement('p');
    credit.className = 'stock-credit';
    credit.textContent = `by ${String(hit.by || 'Pixabay contributor')} on Pixabay`;
    const tags = document.createElement('p');
    tags.textContent = String(hit.tags || 'Stock video');
    details.append(duration, credit, tags);
    card.append(details);
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.textContent = 'Use this clip';
    choose.addEventListener('click', () => onChoose(String(hit.id), choose));
    card.append(choose);
    container.append(card);
  }
  return container.childElementCount;
}

export function initCutEditor(root = document) {
  const byId = (id) => root.getElementById(id);
  const video = byId('cut-preview');
  if (!video) return;
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  let videoId = params.get('videoId') || video.dataset.videoId || '';
  const source = params.get('src');
  if (source) video.src = source;

  const stockOpen = byId('stock-open');
  const stockSheet = byId('stock-sheet');
  const stockClose = byId('stock-close');
  const stockForm = byId('stock-search-form');
  const stockQuery = byId('stock-query');
  const stockSubmit = byId('stock-search');
  const stockStatus = byId('stock-status');
  const stockResults = byId('stock-results');
  const selectedCredit = byId('selected-clip-credit');
  stockOpen?.addEventListener('click', () => { stockSheet.hidden = false; stockQuery?.focus(); });
  stockClose?.addEventListener('click', () => { stockSheet.hidden = true; stockOpen?.focus(); });
  stockForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = stockQuery.value.trim();
    if (query.length < 2) { stockStatus.textContent = 'Enter at least two characters to search.'; return; }
    stockSubmit.disabled = true;
    stockStatus.textContent = 'Searching Pixabay…';
    stockResults.replaceChildren();
    try {
      const response = await fetch(`/api/stock/videos?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        stockStatus.textContent = payload.error || payload.message || `Stock search failed (${response.status}).`;
        return;
      }
      const count = renderStockResults(stockResults, payload.hits, (id, button) => importStockClip(id, button));
      stockStatus.textContent = count ? `${count} stock clips. Each is copied into Cohabi with its maker credited.` : 'No clips found. Try another search.';
    } catch {
      stockStatus.textContent = 'Could not reach stock search. Check your connection and try again.';
    } finally { stockSubmit.disabled = false; }
  });

  const start = byId('trim-start');
  const end = byId('trim-end');
  const text = byId('edit-text');
  const position = byId('text-position');
  const music = byId('music-track');
  const musicWrap = byId('music-wrap');
  const volume = byId('music-volume');
  const cover = byId('cover-scrub');
  const coverUse = byId('cover-use');
  const exportButton = byId('export-feed');
  let draftKey = `${DRAFT_PREFIX}${videoId || 'unassigned'}`;
  let draft = safeRead(draftKey);
  if (draft) {
    if (Number.isFinite(draft.trimStart)) start.value = String(draft.trimStart);
    if (Number.isFinite(draft.trimEnd)) end.value = String(draft.trimEnd);
    if (typeof draft.textBody === 'string') text.value = draft.textBody;
    if (['top', 'middle', 'bottom'].includes(draft.textPosition)) position.value = draft.textPosition;
    if (typeof draft.musicId === 'string') music.value = draft.musicId;
    if (Number.isFinite(draft.musicVolume)) volume.value = String(draft.musicVolume);
    if (Number.isFinite(draft.coverSec)) cover.value = String(draft.coverSec);
  }

  let duration = 0;
  const clampTime = (value) => Math.max(0, Math.min(duration || Number(value) || 0, Number(value) || 0));
  const saveDraft = () => {
    const values = {
      trimStart: clampTime(start.value), trimEnd: clampTime(end.value),
      textBody: text.value, textPosition: position.value, musicId: music.value,
      musicVolume: Number(volume.value), coverSec: clampTime(cover.value),
    };
    safeWrite(draftKey, values);
    return values;
  };
  const syncRange = (changed) => {
    const a = clampTime(start.value);
    const b = clampTime(end.value);
    if (changed === start && a >= b) start.value = String(Math.max(0, b - 0.01));
    if (changed === end && b <= a) end.value = String(Math.min(duration || b + 0.01, a + 0.01));
    saveDraft();
  };

  video.addEventListener('loadedmetadata', () => {
    duration = Number.isFinite(video.duration) ? video.duration : 0;
    for (const input of [start, end, cover]) input.max = String(duration);
    end.value = String(Math.max(0, duration));
    if (draft) {
      if (Number.isFinite(draft.trimStart)) start.value = String(clampTime(draft.trimStart));
      if (Number.isFinite(draft.trimEnd)) end.value = String(clampTime(draft.trimEnd));
      if (Number.isFinite(draft.coverSec)) cover.value = String(clampTime(draft.coverSec));
    }
    cover.value = String(clampTime(cover.value));
    saveDraft();
  });
  video.addEventListener('timeupdate', () => {
    if (Number(cover.value) !== video.currentTime) cover.value = String(video.currentTime);
  });
  start.addEventListener('input', () => syncRange(start));
  end.addEventListener('input', () => syncRange(end));
  for (const input of [text, position, music, volume]) input.addEventListener('input', saveDraft);
  music.addEventListener('change', saveDraft);
  cover.addEventListener('input', () => {
    video.currentTime = clampTime(cover.value);
    saveDraft();
  });
  coverUse.addEventListener('click', () => {
    cover.value = String(clampTime(video.currentTime));
    saveDraft();
    showToast('Cover frame saved in this draft.');
  });

  exportButton.addEventListener('click', async () => {
    const values = saveDraft();
    let edit;
    try {
      edit = buildEdit({ ...values, coverSec: values.coverSec });
    } catch (error) {
      showToast(error.message);
      return;
    }
    if (!videoId) {
      showToast('Pick a video before exporting. Your edit is saved here.');
      return;
    }
    exportButton.disabled = true;
    try {
      const response = await fetch('/api/cut/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ videoId, edit }),
      });
      if (response.status === 404) {
        showToast("Export isn't open yet — your edit is saved here.");
      } else if (!response.ok) {
        showToast('Export could not finish. Your edit is saved here.');
      } else {
        showToast('Export requested. Review it before posting.');
      }
    } catch {
      showToast('Export is unavailable offline. Your edit is saved here.');
    } finally {
      exportButton.disabled = false;
    }
  });

  loadMusic(music, musicWrap, draft?.musicId || '').then(saveDraft);
  saveDraft();
}

if (typeof document !== 'undefined') initCutEditor();
