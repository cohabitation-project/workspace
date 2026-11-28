// A YouTube or Vimeo link in a post shows the video's picture with a play button (Geoffrey, 2026-11-25), and the page
// is allowed to load that picture and, on play, the privacy-enhanced player.
import test from 'node:test';
import assert from 'node:assert/strict';
import { videoLinkCard } from '../lib/feedv2.mjs';
import fs from 'node:fs';

test('YouTube links (watch, short, shorts, youtu.be) become a play card; other links do not', () => {
  for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ']) {
    const c = videoLinkCard(`look at this ${url} wow`);
    assert.match(c, /i\.ytimg\.com\/vi\/dQw4w9WgXcQ\/hqdefault\.jpg/, url);
    assert.match(c, /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/, url);
  }
  assert.match(videoLinkCard('https://vimeo.com/76979871'), /player\.vimeo\.com\/video\/76979871/);
  assert.equal(videoLinkCard('https://example.com/watch?v=dQw4w9WgXcQ'), '');
  assert.equal(videoLinkCard('no links here'), '');
  assert.doesNotMatch(videoLinkCard('https://youtu.be/"><script>'), /<script>/, 'only an 11-character id is ever used');
});

test('the page policy lets the thumbnail and the player load, and nothing else new', () => {
  const s = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.match(s, /img-src 'self' data: https:\/\/i\.ytimg\.com;/);
  assert.match(s, /frame-src 'self' https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com;/);
});
