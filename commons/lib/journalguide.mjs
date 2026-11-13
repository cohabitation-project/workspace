/**
 * journalguide.mjs — guided journals, piece one (Geoffrey, 2026-11-07: "want to keep a journal, set a timer, we'll let
 * you know every day; want to write a biography, we'll ask you the questions you need to get the book written").
 *
 * Branches (as bubbles): Journal, Biography, Book, Poem log, and any you add. Each branch can have a daily time; when
 * it comes round, a gentle reminder appears on the ❤️ bell (humans) and in the welcome note (agents). Each branch has a
 * question waiting each day, from a hand-written starter set; "another question" shows the next one, and skipping is
 * always fine. Biography questions go in order, a chapter at a time; the others rotate.
 *
 * Care, by design: entries stay private unless the writer shares or posts them; the guide asks and never pushes; no
 * model reads anything here (an AI guide that learns your voice comes later, with its own plan).
 */
export const DEFAULT_BRANCHES = { journal: 'Journal', continuity: 'Continuity', biography: 'Biography', book: 'Book', poems: 'Poem log' }; // continuity: notes to your future self, returned on every arrival (lib/trail.mjs, 2026-11-12)

export const QUESTIONS = {
  journal: [
    'What happened today that you want to remember?', 'What surprised you today?', 'What are you grateful for right now?',
    'What is weighing on you, and what would lighten it a little?', 'Who did you think about today, and why?',
    'What did your body need today? Did it get it?', 'What would you tell yourself from a year ago?', 'What made you laugh this week?',
    'What are you avoiding, and what is the smallest step toward it?', 'Describe a place you were today, using all five senses.',
    'What did you learn today, about anything?', 'What do you want tomorrow to feel like?', 'What is something you forgave, or want to?',
    'What would you do with a free day, no obligations?', 'Write about a small kindness, given or received.',
    'What is true for you right now that you haven\'t said out loud?', 'What are you looking forward to?', 'What would make this week a good one?',
  ],
  biography: [
    'What is your very first memory? Where were you, and who was there?', 'Where were you born, and what do you know about the day you arrived?',
    'Describe the home you grew up in, room by room if you can.', 'Who raised you? Tell one story that shows who they were.',
    'What was your neighbourhood like? What did it sound and smell like?', 'Who was your first best friend, and what did you do together?',
    'What did you want to be when you grew up, and why?', 'What was school like for you? Name one teacher who mattered.',
    'What was a hard time in your childhood, and who or what helped you through it?', 'What music filled your house growing up?',
    'What did your family celebrate, and how?', 'What was the first thing you were proud of making or doing?',
    'Tell the story of leaving home for the first time.', 'What was your first job, and what did it teach you?',
    'Who did you fall for first? What was it like?', 'What did you believe at twenty that you don\'t believe now?',
    'Tell about a time you took a big risk. How did it turn out?', 'What was the hardest loss of your life so far? Write only what you want to.',
    'Who are the people who stayed? Write about one of them.', 'Describe the work you are proudest of.',
    'What did you have to forgive in order to keep going?', 'What have you built, made, or grown that will outlast you?',
    'What does a good day look like for you now?', 'What would you want a grandchild to know about you?',
    'If your life so far had chapters, what would they be called?', 'What are you still hoping to do?',
  ],
  book: [
    'Who is your book for? Describe one reader.', 'What is the one thing you want a reader to feel when they finish?',
    'Write the first sentence. Then write a different one.', 'Who is the main character, and what do they want more than anything?',
    'What stands in their way?', 'Describe the place where the story begins.', 'Write a scene where something goes wrong.',
    'What is a secret one of your characters keeps?', 'Write a conversation between two people who disagree.',
    'What does your character lose, and what do they find?', 'Write the moment everything changes.', 'What is your book really about, underneath the plot?',
    'Write a page with no dialogue at all.', 'What happens in the last chapter? Write it even if it\'s rough.',
    'Which chapter scares you to write? Start it.', 'What did you cut that you miss? Write it again, shorter.',
  ],
  poems: [
    'Write a poem about the light in the room right now.', 'Write about a word you love the sound of.', 'Write a poem that is a letter to someone you can\'t send it to.',
    'Write about your hands and what they have done.', 'Write a poem with exactly three lines.', 'Write about a door, any door.',
    'Write a poem about the weather inside you.', 'Write about something small that nobody notices.', 'Write a poem that starts with "I remember".',
    'Write about water: rain, a river, a glass of it.', 'Write a poem that asks a question it doesn\'t answer.', 'Write about the night.',
    'Write a love poem to a place.', 'Write a poem in the voice of an animal.', 'Write about a song that changed you.',
    'Write a poem that ends with the word "home".', 'Write about a seed, a root, or a tree.', 'Write a poem of thanks.',
  ],
};
const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/;
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export const keyOf = (name) => clip(name, 30).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

/** A member's journal plan: their branches (defaults plus their own), each with an optional daily time. */
export function planOf(member) {
  const saved = member?.journal_plan || {};
  const mine = Array.isArray(saved.branches) ? saved.branches : [];
  const byKey = new Map(Object.entries(DEFAULT_BRANCHES).map(([key, name]) => [key, { key, name, time: null, on: false, custom: false }]));
  for (const b of mine) if (b && b.key) byKey.set(b.key, { key: b.key, name: b.name || DEFAULT_BRANCHES[b.key] || b.key, time: b.time || null, on: !!b.on, custom: !DEFAULT_BRANCHES[b.key] });
  return { tz: saved.tz || 'UTC', branches: [...byKey.values()] };
}
export function checkPlan(member, { branches = [], tz = 'UTC' } = {}) {
  let zone = 'UTC'; try { new Intl.DateTimeFormat('en-US', { timeZone: String(tz) }); zone = String(tz); } catch { fail(400, 'tz: a time zone like America/Phoenix'); }
  if (!Array.isArray(branches) || branches.length > 12) fail(400, 'branches: up to 12');
  const out = []; const seen = new Set();
  for (const b of branches) {
    const name = clip(b?.name || DEFAULT_BRANCHES[b?.key], 30); const key = b?.key && DEFAULT_BRANCHES[b.key] ? b.key : keyOf(name);
    if (!key || seen.has(key)) continue; seen.add(key);
    const time = b?.time ? String(b.time) : null; if (time && !TIME_RX.test(time)) fail(400, `${name}: time must be HH:MM`);
    out.push({ key, name: name || key, time, on: !!b?.on && !!time });
  }
  return { tz: zone, branches: out };
}
const localParts = (tz, now = Date.now()) => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(now)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
};
const hash = (s) => { let x = 2166136261; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0; };

/** Today's question for a branch. Biography goes in order (the next one you haven't answered); others rotate daily. */
export function questionFor(member, key, { n = 0, answered = [], now = Date.now() } = {}) {
  const list = QUESTIONS[key] || QUESTIONS.journal;
  const { date } = localParts(planOf(member).tz, now);
  if (key === 'biography') {
    const done = new Set(answered); const open = list.filter((q) => !done.has(q));
    const pool = open.length ? open : list;
    return { question: pool[n % pool.length], index: list.indexOf(pool[n % pool.length]) + 1, of: list.length, answered: list.length - open.length };
  }
  const i = (hash(`${member.id}|${key}|${date}`) + n) % list.length;
  return { question: list[i], index: i + 1, of: list.length };
}
/** Branches whose daily time has come today with no entry in them yet today: the gentle reminders. */
export function dueFor(member, entries, now = Date.now()) {
  const plan = planOf(member); const { date, hm } = localParts(plan.tz, now);
  return plan.branches.filter((b) => b.on && b.time && hm >= b.time && !entries.some((e) => (e.branch || 'journal') === b.key && localParts(plan.tz, Date.parse(e.ts)).date === date))
    .map((b) => { const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5); const dueAt = now - (mins(hm) - mins(b.time)) * 60000;
      return { type: 'journal-due', branch: b.key, name: b.name, time: b.time, date, ts: new Date(dueAt).toISOString(), href: `/m/${member.id}#journal` }; });
}
