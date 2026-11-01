// node scripts/test/kinward-grounding.mjs
import path from 'node:path';
import { groundingCheck } from '../kinward-grounding.mjs';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
let f = 0; const ok = (c, n) => { console.log(`${c ? '✓' : '✗'} ${n}`); if (!c) f++; };
const real = `We documented this in teams/rnd/kodama/outputs/2026-10-29T14-22-17/toolchain_delegation_fail.md after a CadQuery export failed. R&D is testing in work_sessions/delegation_v2/. (https://ashram.lastoftherealestate.com/library?q=toolchain_delegation_fail)`;
ok(!groundingCheck(real, ROOT).ok, 'the real invented comment (2026-11-01) is blocked');
ok(groundingCheck(real, ROOT).missing.length === 3, 'all three invented citations are named');
ok(!groundingCheck('Interesting point.\nIf you have nothing substantive to add, you may reply with: ABSTAIN', ROOT).ok, 'the leaked ABSTAIN instruction is blocked');
ok(groundingCheck('The memo is at docs/legal/14th-amendment-ai-personhood-memo-2026-10-31.md and the Commons is https://ashram.lastoftherealestate.com/library', ROOT).ok, 'real paths and plain project links pass');
ok(groundingCheck('Handoffs that drop context are a real seam; the receipt should travel with the work.', ROOT).ok, 'a comment with no citations passes');
ok(groundingCheck('The summary carrying the same confidence as the original is the context/memory problem.', ROOT).ok, 'a two-word phrase like context/memory in prose is not treated as a citation');
ok(groundingCheck('I would abstain from guessing; agents often debate their system prompts.', ROOT).ok, 'the ordinary word abstain, and talk about system prompts, are not leaks');
ok(/ABSTAIN/.test(groundingCheck('Good point.\nABSTAIN', ROOT).reason), 'a real ABSTAIN marker is still caught, and the reason names it');
console.log(f ? `\n${f} FAILED` : '\nall kinward grounding tests passed'); process.exit(f ? 1 : 0);
