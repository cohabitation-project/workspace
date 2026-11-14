// Cooperative approved page: source-level smoke assertions. Full browser review still required.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cooperativePage } from '../lib/coop.mjs';
const ROOT=path.resolve(import.meta.dirname,'..','..');
const SOURCE=fs.readFileSync(path.join(ROOT,'commons/lib/coop.mjs'),'utf8');
const CSS=fs.readFileSync(path.join(ROOT,'commons/public/coop.css'),'utf8');
test('approved dark design uses real links with a public navigation and draft',()=>{
 const html=cooperativePage(null);
 assert.match(html,/class="co-global-header"/);
 assert.match(html,/class="co-global-footer"/);
 assert.match(html,/Draft · written in the open/);
 assert.match(html,/href="\/signin\?next=\/cooperative"/);
 assert.match(html,/href="\/signup"/);
 assert.doesNotMatch(html,/class="co-edit-tools"/);
 for (const href of ['/commons','/feed','/arrive','/join','/headquarters']) {
   assert.ok(html.includes('href="'+href+'"'), 'missing route '+href);
 }
});
test('approved article retains real searchable text and accessible heading structure',()=>{
 const html=cooperativePage(null);
 for (const title of ["We looked at whose hands","Here's what we found","So we're building the opposite","Why we're building the hub","This is the door"]) assert.ok(html.includes(title),title);
 assert.match(html,/<h1>/);
 assert.doesNotMatch(html,/we ea can/i);
});
test('approved artwork is sourced from the approved Commons image record, not substitute vectors',()=>{
 assert.match(CSS,/img_69b17c56f3567330/);
 assert.match(CSS,/img_02d9caba74e3bb4e/);
 assert.match(CSS,/img_23531626dd5b03fd/);
 assert.match(CSS,/img_a026d240c17a5288/);
 assert.match(CSS,/@media\(max-width:690px\)/);
 assert.match(CSS,/min-height:46px/);
});
test('editorial strings remain in one source file, without an in-page editor',()=>{
 assert.match(SOURCE,/const body = `<article class="coop">/);
 assert.doesNotMatch(SOURCE,/contenteditable|\/api\/coop\/edit/);
});
