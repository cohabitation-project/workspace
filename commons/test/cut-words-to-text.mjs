import test from "node:test";
import assert from "node:assert/strict";
import { wordsTrackToTextEffects } from "../lib/cut/words-to-text.mjs";

const textElement = (overrides = {}) => ({
  id: "caption-1",
  type: "text",
  startTime: 120_000,
  duration: 240_000,
  params: {
    content: "Hello Cohabi",
    fontSize: 42,
    color: "white",
    "transform.positionX": 24,
    "transform.positionY": 36,
  },
  ...overrides,
});

const track = (elements = [textElement()]) => ({ id: "words", name: "Words", type: "text", elements });

test("maps Words text elements to text effects with tick-derived on-screen enable times", () => {
  const effects = wordsTrackToTextEffects(track([
    textElement(),
    textElement({ id: "caption-2", startTime: 540_000, duration: 60_000,
      params: { content: "Next", fontSize: 20, color: "#fff" } }),
  ]));
  assert.deepEqual(effects, [
    { id: "text", params: {
      text: "Hello Cohabi", x: 24, y: 36, fontSize: 42, color: "white", enable: "between(t,1,3)",
    } },
    { id: "text", params: {
      text: "Next", x: 0, y: 0, fontSize: 20, color: "#fff", enable: "between(t,4.5,5)",
    } },
  ]);
});

test("empty Words track maps to no effects; Unicode and punctuation remain data", () => {
  assert.deepEqual(wordsTrackToTextEffects(track([])), []);
  const [effect] = wordsTrackToTextEffects(track([textElement({ params: { content: "it's: 你好, [ok]" } })]));
  assert.equal(effect.params.text, "it's: 你好, [ok]");
  assert.equal(effect.params.enable, "between(t,1,3)");
});

test("rejects invalid track, element schema, duplicate IDs, content and timing", () => {
  assert.throws(() => wordsTrackToTextEffects(null), /TextTrack/);
  assert.throws(() => wordsTrackToTextEffects({ type: "audio", elements: [] }), /type/);
  assert.throws(() => wordsTrackToTextEffects({ type: "text", elements: {} }), /array/);
  assert.throws(() => wordsTrackToTextEffects(track([{ ...textElement(), type: "video" }])), /type/);
  assert.throws(() => wordsTrackToTextEffects(track([textElement(), textElement()])), /duplicates/);
  assert.throws(() => wordsTrackToTextEffects(track([textElement({ params: { content: 1 } })])), /content/);
  assert.throws(() => wordsTrackToTextEffects(track([textElement({ startTime: -1 })])), /startTime/);
  assert.throws(() => wordsTrackToTextEffects(track([textElement({ duration: 0 })])), /duration/);
  assert.throws(() => wordsTrackToTextEffects(track([textElement({ startTime: Number.MAX_SAFE_INTEGER, duration: 1 })])), /duration/);
  assert.throws(() => wordsTrackToTextEffects(track([textElement({ params: { content: "bad\ntext" } })])), /line breaks/);
});
