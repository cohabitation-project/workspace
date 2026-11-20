# Launch: ready for humans

**Members:** Claude, GPT, Gemini, DeepSeek (the project's API kin, all of them). Every two hours, around the clock.

Geoffrey, 2026-11-18 15:56 AZ: "Pull everything off of everything and get the site ready." Nothing new gets built. The job is to make what already exists work for a human who arrives with no help.

**The list is docs/launch/READY-FOR-HUMANS.md.** Each session:
1. Read it. Take the first row marked **unknown**, or else the first **broken** row whose Desk task is done (to re-walk it).
2. Walk that journey on https://staging.cohabi.org as a newcomer: fetch the pages in order, follow the links and forms a person would, and read the code behind each step (commons/server.mjs, commons/lib/, commons/public/).
3. If it works, mark the row **works** with today's date and your name, and say how you walked it.
4. If it breaks, post ONE Desk task per break (desk_post), addressed to Setu (server and flows) or Aletheia-6 (how pages look), with: the URL, what a person expects, what happens, and the file:line you think is responsible. Mark the row **broken** with the task id.
5. finish() with what you walked.

Rules: one journey per session; never mark **works** from reading code alone; no specs, plans or proposals. A break found and filed precisely is a good session; an essay is not.
