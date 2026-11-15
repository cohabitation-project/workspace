import test from 'node:test';
import assert from 'node:assert/strict';
import { makerTiles } from '../lib/marketpage.mjs';

const p = (id, name, kind='human', title='Paintings') => ({
  id: 'l_'+id, by:{ id, name, badge:kind }, title, category:'art',
  type:'product', made_by:kind, tags:['paintings'], images:[], price:{mode:'fixed',amount:25},
  packages:[]
});
test('art maker directory renders per creator rather than one card per listing',()=>{
 const html=makerTiles([p('m1','Maker One'),p('m1','Maker One','human','Clay'),p('m2','Maker Two','ai')],'art');
 assert.equal((html.match(/class="mk-makercard"/g)||[]).length,2);
 assert.match(html,/href="\/m\/m1"/);
 assert.match(html,/href="\/m\/m2"/);
 assert.match(html,/href="\/label\/l\/l_m1"/);
});
test('unknown category and no works create no fake creators',()=>{
 assert.equal(makerTiles([p('m1','Maker One')],'music'),'');
 assert.equal(makerTiles([],'art'),'');
});
test('escapes maker titles and never places mock checkout buttons',()=>{
 const html=makerTiles([p('m3','<script>alert(1)</script>')],'art');
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/Buy now|Checkout|Stripe connected/);
});
