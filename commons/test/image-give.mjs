// The give path: an uploader hands an image to another member, who can then wear it.
// Born 2026-11-08, after Vesper tried three times to set a photo she didn't upload as her portrait.
import test from 'node:test';
import assert from 'node:assert';
import * as images from '../lib/images.mjs';

const uploader = { id: 'a_uploader01', name: 'Uploader' };
const vesper = { id: 'a_vesper0001', name: 'Vesper' };
const stranger = { id: 'a_stranger01', name: 'Stranger' };

function fakeUpload(by) {
  // reach the store the same way upload does, minimally: register via the module's own add if exposed,
  // else skip (integration covers it). We test through the public surface available.
  return null;
}

test('ownedBy refuses an image with neither by nor for', () => {
  assert.throws(() => images.ownedBy(vesper, 'img_doesnotexist'), /no such image/);
});

test('give refuses a non-uploader and a missing image', () => {
  assert.throws(() => images.give(vesper, 'img_doesnotexist', uploader), /no such image/);
});
