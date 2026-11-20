// Team prototype: insert a generated Words TextTrack into OpenCut-style SceneTracks.
// SceneTracks shape follows commons/lib/cut/model.mjs:
// { overlay: Track[], main: Track, audio: Track[] }.
// Pure/immutable helper; it does not mutate editor state or implement undo/UI.

import { captionBlocksToWordsTrack } from './captions-words-adapter.mjs';

function assertSceneTracks(tracks) {
  if (!tracks || typeof tracks !== 'object' || Array.isArray(tracks) ||
      !Array.isArray(tracks.overlay) || !tracks.main || typeof tracks.main !== 'object' ||
      !Array.isArray(tracks.main.elements) || !Array.isArray(tracks.audio)) {
    throw new TypeError('SceneTracks must have overlay[], main track, and audio[]');
  }
  for (const [group, list] of [['overlay', tracks.overlay], ['audio', tracks.audio]]) {
    for (const [index, track] of list.entries()) {
      if (!track || typeof track !== 'object' || !Array.isArray(track.elements)) {
        throw new TypeError(`tracks.${group}[${index}] must be a track with elements[]`);
      }
    }
  }
}

/**
 * Create or replace the named Words text track in SceneTracks.
 * A match is an existing text track with the requested id OR the requested
 * name. Multiple matches are rejected rather than silently deleting tracks.
 * All other tracks/elements remain unchanged. Caption element IDs are checked
 * against every retained overlay, main, and audio element.
 */
export function insertWordsTrack({
  tracks,
  blocks,
  trackId = 'words',
  trackName = 'Words',
} = {}) {
  assertSceneTracks(tracks);
  if (typeof trackId !== 'string' || trackId.length === 0) {
    throw new TypeError('trackId must be a non-empty string');
  }
  if (typeof trackName !== 'string' || trackName.length === 0) {
    throw new TypeError('trackName must be a non-empty string');
  }

  const allTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
  const candidates = allTracks.filter((track) => track.type === 'text' &&
    (track.id === trackId || track.name === trackName));
  if (candidates.length > 1) {
    throw new Error(`multiple Words text tracks match id ${trackId} or name ${trackName}`);
  }
  const replacing = candidates[0] ?? null;
  if (!replacing && allTracks.some((track) => track.id === trackId)) {
    throw new Error(`track id collides with an existing non-Words track: ${trackId}`);
  }
  if (replacing && (replacing !== tracks.overlay.find((track) => track === replacing))) {
    throw new Error('the Words text track must be in the overlay list');
  }

  const retainedTracks = allTracks.filter((track) => track !== replacing);
  const retainedTrackIds = new Set(retainedTracks.map((track) => track.id));
  if (replacing && retainedTrackIds.has(trackId)) {
    throw new Error(`track id collides with another track: ${trackId}`);
  }
  const existingElementIds = retainedTracks.flatMap((track) => track.elements.map((element) => element.id));
  const wordsTrack = captionBlocksToWordsTrack({ blocks, trackId, trackName, existingElementIds });

  const overlay = [...tracks.overlay];
  const replaceIndex = replacing ? overlay.indexOf(replacing) : -1;
  if (replaceIndex >= 0) overlay[replaceIndex] = wordsTrack;
  else overlay.push(wordsTrack);
  return { ...tracks, overlay };
}
