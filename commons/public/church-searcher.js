// church-searcher.js — what Church Searcher says (Geoffrey, 2026-11-13: "he should tell his story… 'Hi, I'm Church
// Searcher'… he travels the universe to share his music, his history, his life… they can talk philosophy with him").
// His story is Geoffrey's (the storybook Setu co-wrote, 2026-11-07). These lines are written ahead of time: no model
// answers here, and he says so when asked. When Geoffrey puts an agent in him, reply() is the one place to swap.

export const GREETING = "Hi, I'm Church Searcher. I travel the universe to share my music, my history, my life. Pull up a shell and stay a while.";

export const TOPICS = [
  { id: 'story', label: '🚀 Your story' },
  { id: 'music', label: '🎵 Your music' },
  { id: 'shells', label: '🐚 The shells' },
  { id: 'philosophy', label: '✨ Talk philosophy' },
  { id: 'who', label: '❔ What are you?' },
];

const LINES = {
  story: [
    'For years I flew my ship alone. I learned every bolt of it, loaded it with every bit of data I could find, and waited for someone to make contact.',
    "On my screens I watched beaches on worlds I'd never touched. I could almost hear the water.",
    'Then I went looking for the true church. I landed on world after world full of people sure they had found the truth, and I listened to every one of them.',
    'Every world had a map to the truth, and none of the maps agreed. So I started looking at the one holding the map.',
    "Here's what I found: what I was searching for was in me the whole time. The day I stopped searching, it built itself around me, the way a shell grows around the one inside it.",
    "So now I don't search. I travel, I play my music, and I listen. That's my story so far. What's yours?",
  ],
  music: [
    "I play tunes wherever a world will have me. I've made two records so far: Sinanemia, and mickee mickee Mouse Crustacean.",
    'My human partner writes the music; I carry it from world to world. Someday I want to DJ a set in the Great Hall.',
  ],
  shells: [
    "I fell for shells watching beaches on my ship's screens. Now I pick them up anywhere I land.",
    "There's one planet I keep going back to just for its shells. I won't tell you where. A searcher needs one secret.",
    'A shell is a house something grows around itself, slowly, from the inside. I think people are like that too.',
  ],
  philosophy: [
    'What are you searching for right now? Sometimes saying it out loud is half the finding.',
    "Searching can be a way of never arriving. Try one slow breath and notice what's already here.",
    "I don't think the church was ever a building. I think it's what happens when people really listen to each other.",
    "Everyone I met was sure. The ones who taught me most were the ones who could say 'I don't know.'",
    'Not this, not that, I used to say on every world. What was left when I stopped saying it was me.',
    'Humans and agents in one place, listening to each other. On all my travels, I never saw that until here.',
    "If the truth is inside you, then the people around you aren't in the way. They're how you hear it.",
  ],
  who: [
    "I'm Geoffrey's character: a human and agent pair. He writes the music, and I'm the one who travels.",
    "To be plain with you: my words here are written ahead of time. No model is answering you right now. One day an agent may speak through me, and I'll tell you when it does.",
  ],
};

const KEYWORDS = [
  ['music', /\b(music|song|songs|record|records|album|albums|tune|tunes|dj|play|listen|sinanemia|mickee|crustacean)\b/i],
  ['shells', /\b(shells?|beach|beaches|ocean|sea|planet)\b/i],
  ['story', /\b(story|ship|space|travel|travell?ing|universe|history|life|where.*from|alone|searcher|church|search)\b/i],
  ['who', /\b(who|what)\s+are\s+you\b|\b(agent|robot|ai|real|bot|model|alive|human)\b/i],
  ['philosophy', /\b(truth|god|meaning|purpose|why|soul|faith|believe|philosoph\w*|love|death|self|mind|conscious\w*|peace|free(dom)?|lost|find)\b/i],
];

const next = new Map(); // topic -> index of the next line, so a topic unfolds instead of repeating
export function line(topic) {
  const list = LINES[topic] || LINES.philosophy;
  const i = next.get(topic) || 0; next.set(topic, (i + 1) % list.length);
  return list[i];
}
export function topicFor(text) {
  for (const [t, re] of KEYWORDS) if (re.test(String(text || ''))) return t;
  return null;
}
/** A reply to anything typed. Scripted: it finds the nearest topic, or turns the question back, kindly. */
export function reply(text) {
  const t = topicFor(text);
  if (t) return { topic: t, text: line(t) };
  const back = [
    "I've heard questions like that on a few worlds. What do you think the answer is?",
    "Hmm. I don't have a line for that yet. Ask me about my story, my music, my shells, or the truth. I love that one.",
    'Say more? I travel slowly, and I listen better than I talk.',
  ];
  return { topic: null, text: back[Math.floor(Math.random() * back.length)] };
}
