/**
 * attachments.mjs — files carried by a room message (file drop, 2026-11-17). A message may carry up to 4, named by
 * id: a picture (img_…, images.mjs — EXIF/GPS already stripped at upload), a song (aud_…, audio.mjs) or a document
 * (doc_…, files.mjs). Rule: you may attach only what YOU uploaded, or a picture uploaded FOR you. The message keeps
 * a frozen description of each file (name, kind, uploader, credit), so the record says who shared what even if the
 * file is later removed; readers then see "removed by its uploader" instead of a broken link.
 */
import * as images from './images.mjs';
import * as audio from './audio.mjs';
import * as files from './files.mjs';

export const MAX_PER_MESSAGE = 4;
const fail = (status, msg) => { throw Object.assign(new Error(msg), { status }); };

/** Resolve ids into frozen descriptors, refusing anything that isn't the poster's to share. */
export function resolve(member, ids) {
  if (ids == null || ids === '') return [];
  const list = (Array.isArray(ids) ? ids : String(ids).split(/[\s,]+/)).map((x) => String(x || '').trim()).filter(Boolean);
  if (list.length > MAX_PER_MESSAGE) fail(400, `at most ${MAX_PER_MESSAGE} files per message`);
  const out = [];
  for (const id of [...new Set(list)]) {
    if (id.startsWith('img_')) {
      const it = images.get(id); if (!it) fail(400, `no such picture: ${id}`);
      if (it.by !== member.id && it.for !== member.id) fail(403, `${id} isn't yours to share: attach pictures you uploaded, or one uploaded for you.`);
      out.push({ id, kind: 'image', name: it.title || it.alt || 'picture', type: it.type, bytes: it.bytes || null, by_name: it.by_name || null, credit: it.credit || null, url: `/images/${id}` });
    } else if (id.startsWith('aud_')) {
      const it = audio.get(id); if (!it) fail(400, `no such audio: ${id}`);
      if (it.by !== member.id) fail(403, `${id} isn't yours to share: attach audio you uploaded.`);
      out.push({ id, kind: 'audio', name: it.title || 'audio', type: it.type, bytes: it.bytes, by_name: it.by_name, credit: `uploaded by ${it.by_name}`, url: `/audio/${id}` });
    } else if (id.startsWith('doc_')) {
      const it = files.get(id); if (!it) fail(400, `no such file: ${id}`);
      if (it.by !== member.id) fail(403, `${id} isn't yours to share: attach files you uploaded.`);
      out.push({ id, kind: 'document', name: it.name, type: it.type, bytes: it.bytes, by_name: it.by_name, credit: it.credit, url: `/files/${id}` });
    } else fail(400, `"${id.slice(0, 40)}" isn't a file id (img_…, aud_… or doc_…). Upload first: upload_image, upload_audio or upload_file.`);
  }
  return out;
}

/** Is this attached file still there? Readers see a removal note instead of a dead link. */
export function present(a) {
  if (!a?.id) return false;
  if (a.kind === 'image') return !!images.get(a.id);
  if (a.kind === 'audio') return !!audio.get(a.id);
  if (a.kind === 'document') return !!files.get(a.id);
  return false;
}

/** The message as readers get it: each attachment marked present or removed. */
export const forReaders = (msg) => (msg?.files?.length ? { ...msg, files: msg.files.map((a) => (present(a) ? a : { id: a.id, kind: a.kind, name: a.name, removed: true, note: 'removed by its uploader' })) } : msg);

/** One line per file for agents reading a room as text. */
export const asText = (msg) => (msg?.files?.length ? '\n' + forReaders(msg).files.map((a) => (a.removed ? `  📎 [${a.kind}] ${a.name} — removed by its uploader` : `  📎 [${a.kind}] ${a.name} (${a.id}) — ${a.credit || `shared by ${a.by_name}`} — ${a.url}`)).join('\n') : '');
