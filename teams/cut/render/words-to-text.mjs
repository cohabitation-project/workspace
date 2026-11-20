// Cohabi Cut Job 3 follow-up: convert OpenCut-style Words TextTrack elements
// into timing-bearing text-effect descriptors.
//
// The returned shape is [{ id: "text", params }], one per text element. Times
// are 120,000 timeline ticks/second; `enable` is an ffmpeg drawtext expression
// in output seconds. This module is a descriptor adapter, not a render result.
// The current registry.text.toFilter validates the text/style fields but ignores
// `enable`; a later planner/registry integration must append that option to the
// drawtext filter before these descriptors produce timed on-screen text.

import { registry } from "./registry.mjs";

export const WORDS_TICKS_PER_SECOND = 120_000;

function timeSeconds(ticks, label) {
  if (!Number.isSafeInteger(ticks) || ticks < 0) {
    throw new RangeError(`${label} must be a non-negative safe-integer tick value`);
  }
  return (ticks / WORDS_TICKS_PER_SECOND).toFixed(6).replace(/\.?0+$/, "") || "0";
}

function assertTrack(track) {
  if (!track || typeof track !== "object" || Array.isArray(track)) {
    throw new TypeError("track must be a TextTrack object");
  }
  if (track.type !== "text") throw new TypeError("track.type must be text");
  if (!Array.isArray(track.elements)) throw new TypeError("track.elements must be an array");
}

/**
 * Map a Words TextTrack to one text effect descriptor per element.
 * Source tick fields remain the authority for timing; IDs are carried only for
 * traceability and not passed to ffmpeg.
 */
export function wordsTrackToTextEffects(track) {
  assertTrack(track);
  const seen = new Set();
  return track.elements.map((element, index) => {
    const where = `track.elements[${index}]`;
    if (!element || typeof element !== "object" || Array.isArray(element)) {
      throw new TypeError(`${where} must be an object`);
    }
    if (element.type !== "text") throw new TypeError(`${where}.type must be text`);
    if (typeof element.id !== "string" || element.id.length === 0) {
      throw new TypeError(`${where}.id must be a non-empty string`);
    }
    if (seen.has(element.id)) throw new Error(`${where}.id duplicates a prior text element`);
    seen.add(element.id);
    if (!element.params || typeof element.params !== "object" || Array.isArray(element.params)) {
      throw new TypeError(`${where}.params must be an object`);
    }
    const { content } = element.params;
    if (typeof content !== "string") throw new TypeError(`${where}.params.content must be a string`);
    const start = timeSeconds(element.startTime, `${where}.startTime`);
    if (!Number.isSafeInteger(element.duration) || element.duration < 1 ||
        !Number.isSafeInteger(element.startTime + element.duration)) {
      throw new RangeError(`${where}.duration must produce a positive safe-integer end tick`);
    }
    const end = timeSeconds(element.startTime + element.duration, `${where}.endTime`);
    const params = {
      text: content,
      x: element.params["transform.positionX"] ?? 0,
      y: element.params["transform.positionY"] ?? 0,
      fontSize: element.params.fontSize ?? 32,
      color: element.params.color ?? "white",
      enable: `between(t,${start},${end})`,
    };
    // Reuse the registry's accepted text/style parameter validation without
    // changing its API or claiming the returned filter has been rendered.
    registry.text.toFilter(params);
    return { id: "text", params };
  });
}
