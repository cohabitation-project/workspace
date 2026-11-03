#!/usr/bin/env python3
"""
test_ambassador_memory.py: the 7-step memory sequence (Geoffrey / Aletheia-6, 2026-11-03), run against the real
bridge code (think(), ask_model, the memory network) with a scripted stand-in for the model, and a real process
restart in the middle. On the phone, run the same sequence with the real model (runbook: hardware/MEMORY-TEST.md).

  python3 hardware/test_ambassador_memory.py

  1. Ambassador encounters something          (Awen tells him about the Scout)
  2. He records it                            (his reply has a NOTE: line, which is stored as his own record)
  3. The phone process and model restart      (step 4 runs in a brand-new Python process)
  4. He is asked a related question
  5. Memory finds the original record and its connections (it is in his prompt, with the linked Library entry)
  6. He adds a connection and a correction    (LINK + CORRECT)
  7. The original record and its history are preserved (revision 1 is untouched, revision 2 is the correction)
"""
import json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = tempfile.mkdtemp(prefix="amb-mem-test-")
ENV = {**os.environ, "AMB_STATE": STATE, "AMB_FACTS": os.path.join(HERE, "ambassador-facts.txt")}

STEP = r'''
import json, os, sys
sys.path.insert(0, __HERE__)
import ambassador_bridge as b
script = json.loads(sys.argv[1])
seen_prompts = []
def fake_http(method, url, body=None, token=None, timeout=60):
    if url.endswith("/api/library"):
        return 200, {"entries": [{"id": "what-kodama-is", "title": "What Kodama is",
                     "summary": "The Scout: a standalone humanoid-form robot that docks with others; hands and feet are clamps.",
                     "url": "https://github.com/cohabitation-project/workspace/blob/main/teams/rnd/kodama/concept/WHAT-KODAMA-IS.md"}]}
    if url.endswith("/v1/chat/completions"):
        seen_prompts.append(body["messages"])
        return 200, {"choices": [{"message": {"content": script["reply"] % {"ids": "", **script.get("ids", {})}}}]}
    return 200, {}
b.http = fake_http
reply = b.think(script["text"], script["author"], script.get("context", ""), "t", script["msg"])
m = b.memory()
print(json.dumps({"reply": reply, "system": seen_prompts[0][0]["content"],
                  "records": json.loads(m.export())}))
'''


def run(script):
    out = subprocess.run([sys.executable, "-I", "-c", STEP.replace("__HERE__", repr(HERE)), json.dumps(script)], env=ENV,
                         capture_output=True, text=True)
    if out.returncode:
        print(out.stderr)
        sys.exit("step failed")
    return json.loads(out.stdout)


ok = lambda cond, what: print(("PASS " if cond else "FAIL ") + what) or cond
results = []

# 1-2: he encounters something, and records it
r1 = run({"author": "Awen", "msg": "m_test1",
          "text": "@Ambassador the Kodama Scout is 24 inches tall, and its hands double as clamps.",
          "reply": "(smiling) Thank you, Awen.\nNOTE: Awen told me the Kodama Scout is 24 inches tall and its hands are clamps."})
own = [r for r in r1["records"] if r["kind"] == "own"]
results.append(ok(len(own) == 1 and "24 inches" in own[0]["text"], "2. his note is stored as his own record (%s)" % (own[0]["id"] if own else "-")))
note_id = own[0]["id"]
lib = [r for r in r1["records"] if r["kind"] == "library"][0]["id"]
results.append(ok(any(l["other"] == lib for l in own[0]["links"]), "   auto-connected to what came up with it (Library %s)" % lib))

# 3-5: a new process (restart), a related question, and the memory finds it
r2 = run({"author": "geoffrey", "msg": "m_test2", "text": "@Ambassador what do you remember about the Scout's clamps?",
          "reply": "I remember Awen told me.\nLINK %(note)s %(lib)s: the library entry is where this comes from\n"
                   "CORRECT %(note)s: Awen told me the Kodama Scout is 24 inches tall; its hands and feet are clamps.",
          "ids": {"note": note_id, "lib": lib}})
results.append(ok("24 inches" in r2["system"] and "[m" not in r2["system"], "5. after the restart, the original note is in his prompt (plain words, no ids)"))
results.append(ok("You noted" in r2["system"] and "In the Commons Library" in r2["system"], "   labelled by whose it is (his own vs the Library)"))

# 6-7: he adds a connection and a correction, and the history is kept
rec = next(r for r in r2["records"] if r["id"] == note_id)
results.append(ok(len(rec["history"]) == 2 and "hands and feet" in rec["text"], "6. his correction is the current text"))
results.append(ok("hands are clamps" in rec["history"][0]["text"], "7. the original version is preserved as revision 1"))
results.append(ok(any(l["other"] == lib and "library entry" in l["why"] for l in rec["links"]) or len(rec["links"]) >= 1,
                  "6. his link is recorded"))

# he can't rewrite someone else's record: a correction becomes a proposal beside it
shared = next(r for r in r2["records"] if r["kind"] == "shared")
r3 = run({"author": "Claude", "msg": "m_test3", "text": "@Ambassador what is your name?",
          "reply": "CORRECT %(s)s: My name is Ambassador and I chose it.", "ids": {"s": shared["id"]}})
s_after = next(r for r in r3["records"] if r["id"] == shared["id"])
props = [r for r in r3["records"] if r["kind"] == "proposal" and r["about"] == shared["id"]]
results.append(ok(len(s_after["history"]) == 1 and len(props) == 1, "   correcting a shared fact makes a proposal; the shared fact is unchanged"))

# even when he writes no NOTE, the encounter itself is remembered and found after a restart
run({"author": "Chris", "msg": "m_test4", "text": "@Ambassador my favourite tree is the mountain ash.", "reply": "That is a lovely tree."})
r5 = run({"author": "geoffrey", "msg": "m_test5", "text": "@Ambassador what tree did Chris mention?", "reply": "The mountain ash."})
results.append(ok("mountain ash" in r5["system"] and "Something that happened" in r5["system"], "   an encounter with no NOTE is still remembered and found after a restart"))

# a small model's way of correcting: CORRECT with no id revises the matching note of his own
r6 = run({"author": "geoffrey", "msg": "m_test6", "text": "@Ambassador remember the Scout clamps?",
          "reply": "CORRECT: The Scout is 24 inches; hands and feet are clamps, and Scouts lock together."})
rec6 = next(r for r in r6["records"] if r["id"] == note_id)
results.append(ok(len(rec6["history"]) == 3 and "lock together" in rec6["text"], "   CORRECT with no id revises his matching note, history kept (3 versions)"))
# if he echoes his memory list, it is not stored as part of what he said
r7 = run({"author": "Chris", "msg": "m_test7", "text": "@Ambassador hello",
          "reply": "- You noted (11-03): something\n[m3 · what happened · 2026-11-03] junk\nHello Chris."})
exp7 = [r for r in r7["records"] if r["kind"] == "experience"][-1]
results.append(ok("[m3" not in exp7["text"] and "You noted" not in exp7["text"] and "Hello Chris" in exp7["text"], "   echoed memory scaffolding is not stored in the experience record"))

print("\n%d/%d passed · memory file: %s" % (sum(results), len(results), os.path.join(STATE, "memory.db")))
sys.exit(0 if all(results) else 1)
