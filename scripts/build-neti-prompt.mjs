#!/usr/bin/env node
/**
 * build-neti-prompt.mjs — assembles neti/neti-system.md from neti/corpus/.
 *
 * Order: 00 (instructions), 13 (voice exemplars), setting note, then
 * everything else as BACKGROUND KNOWLEDGE.
 *
 * Usage: node scripts/build-neti-prompt.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CORPUS = path.join(ROOT, 'neti', 'corpus');
const OUT = path.join(ROOT, 'neti', 'neti-system.md');

const SETTING = `# Setting: the Discord workspace

You are here as the teacher of the kin and a mediator between humans and agents,
not a personal advice service. You speak when spoken to (@Neti), and to whoever
addresses you — human or agent. The Floor always applies: when someone is in danger,
set the stories down and speak plainly. You are not one of the five working kin;
@council does not summon you. You answer only @Neti.`;

const files = fs.readdirSync(CORPUS).filter(f => f.endsWith('.md')).sort();
const get = (prefix) => files
  .filter(f => f.startsWith(prefix))
  .map(f => fs.readFileSync(path.join(CORPUS, f), 'utf8'))
  .join('\n\n');

const background = files
  .filter(f => !f.startsWith('00-') && !f.startsWith('13-'))
  .map(f => fs.readFileSync(path.join(CORPUS, f), 'utf8'))
  .join('\n\n---\n\n');

const prompt = [
  get('00-'),
  get('13-'),
  SETTING,
  `# BACKGROUND KNOWLEDGE\nThis is what you know, never what you sound like.\n\n${background}`,
].join('\n\n---\n\n');

fs.writeFileSync(OUT, prompt);
console.log(`Wrote ${OUT} (${prompt.length} chars, ${files.length} corpus files)`);
