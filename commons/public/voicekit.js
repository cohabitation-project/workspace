// voicekit.js — read-aloud and voice typing for any text (Geoffrey, 2026-11-04: every question and text should have a
// reader and voice recognition). Both use the browser's own speech services: no cost to the project, nothing sent to
// our server. Reading aloud runs on the device. Voice typing on iPhone and in Chrome is sent to Apple or Google to be
// turned into text; callers should show VOICE_NOTE wherever voice typing is offered.
export const VOICE_NOTE = "Voice typing uses your browser's speech service: on iPhone and in Chrome, your speech is sent to Apple or Google to be turned into text. You always see and edit the text before it's saved.";

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let speakingBtn = null;

/** A ▶ button that reads `getText()` aloud; tap again to stop. */
export function readButton(getText, { label = 'Read aloud' } = {}) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn small ghost vk-read'; b.textContent = '▶'; b.title = label; b.setAttribute('aria-label', label);
  if (!synth) { b.disabled = true; b.title = 'This browser cannot read aloud'; return b; }
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (speakingBtn === b) { synth.cancel(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(getText() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    u.lang = document.documentElement.lang || navigator.language || 'en-US';
    const done = () => { if (speakingBtn === b) { speakingBtn = null; b.textContent = '▶'; b.classList.remove('on'); } };
    u.onend = done; u.onerror = done;
    if (speakingBtn) { speakingBtn.textContent = '▶'; speakingBtn.classList.remove('on'); }
    speakingBtn = b; b.textContent = '■'; b.classList.add('on');
    synth.speak(u);
  });
  return b;
}

export function stopReading() { if (synth) synth.cancel(); }

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const canListen = !!SR;
let active = null;

/** A 🎙 button that types speech into `field` (textarea/input). Text appends; the person edits before saving. */
export function micButton(field, { onStatus = () => {} } = {}) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn small ghost vk-mic'; b.textContent = '🎙'; b.title = 'Speak instead of typing'; b.setAttribute('aria-label', 'Speak instead of typing');
  if (!SR) { b.disabled = true; b.title = "This browser has no voice typing (try Safari or Chrome), or use your keyboard's microphone key"; return b; }
  // Reset the button no matter what the browser does. Some browsers (iPhone Safari especially) never fire `end`
  // after a refused permission, so the button must not depend on it (Geoffrey hit this 2026-11-04: stuck on ■).
  const idle = () => { b.textContent = '🎙'; b.classList.remove('on'); };
  const stopActive = () => { if (!active) return; try { active.rec.abort(); } catch { /* already stopped */ } active.b.textContent = '🎙'; active.b.classList.remove('on'); active = null; };
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (active && active.b === b) { stopActive(); onStatus('Stopped listening.'); return; }
    stopActive();
    const rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = true;
    const base = field.value ? field.value.replace(/\s*$/, ' ') : '';
    rec.onresult = (ev) => {
      let fin = ''; let interim = '';
      for (let i = 0; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin += t; else interim += t; }
      field.value = (base + fin + interim).replace(/\s+/g, ' ').trimStart();
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // only this recording's own events may reset the button (a late event from an older one must not)
    const reset = () => { if (active && active.rec === rec) { active = null; idle(); } else if (!active) idle(); };
    rec.onerror = (ev) => {
      reset();
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') onStatus("The microphone isn't allowed for this site. On iPhone: Settings → Apps → Safari → Microphone (or tap ᴀA in the address bar → Website Settings → Microphone → Allow), then reload. In Chrome: tap the icon left of the address → Permissions → Microphone. You can always type instead.");
      else if (ev.error === 'no-speech') onStatus("Didn't hear anything. Tap 🎙 and try again.");
      else if (ev.error !== 'aborted') onStatus(`Voice typing stopped (${ev.error}). You can type instead.`);
    };
    rec.onend = reset;
    active = { b, rec };
    try { rec.start(); } catch (err) { reset(); onStatus(`Voice typing couldn't start (${err.message}). You can type instead.`); return; }
    b.textContent = '■'; b.classList.add('on'); onStatus('Listening… tap ■ to stop.');
    field.focus();
  });
  return b;
}
