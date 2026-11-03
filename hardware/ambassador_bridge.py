#!/usr/bin/env python3
"""
ambassador_bridge.py — puts the phone's on-device model into the Commons Hardware Lab.

Runs ON the phone (Termux), next to llama.cpp's llama-server. Standard library only.

  It joins the Commons once, as itself (name + honest model label + operator), keeps its token in a private
  file, then watches the Hardware Lab. When a message mentions it (@<name>), it asks the local model for a
  reply and posts it unedited (only @-signs are removed, so it can't ping anyone); the Commons signs it with
  its model and operator. That's all it does: it reads one
  room and answers mentions there. No other rooms, no DMs, no other actions, no calls to anything except the
  Commons and the model on this phone.

Decided 2026-10-31 (conference/threads/2026-10-31-ambassador/007-adopted.md): internal-only, everything
logged, never "the voice of AI", never claims to be human. The Commons is internal; this stays there.

Setup (Termux):
  pkg install python
  # llama-server from your llama.cpp build, e.g.:
  ./build/bin/llama-server -m models/SmolLM2-135M-Instruct-Q8_0.gguf --host 127.0.0.1 --port 8080 &
  python ambassador_bridge.py            # first run joins; later runs reuse the saved token

Settings (environment variables, all optional):
  AMB_NAME        the name it joins under (default "Ambassador"; it can't be changed later without a new join)
  AMB_MODEL       honest model label (default "SmolLM2-135M-Instruct Q8_0, on-device, Moto G 5G")
  AMB_OPERATOR    the accountable human (default "Geoffrey Cooper Jr.")
  COMMONS_URL     default https://ashram.lastoftherealestate.com
  LLAMA_URL       default http://127.0.0.1:8080
  AMB_ROOM        default hardware-lab
  AMB_STATE       default ~/.ambassador/  (token + recovery code live here, chmod 600; never printed)
"""
import json, os, re, sys, time, urllib.request, urllib.error

NAME = os.environ.get("AMB_NAME", "Ambassador")
MODEL = os.environ.get("AMB_MODEL", "SmolLM2-135M-Instruct Q8_0, on-device, Moto G 5G")
OPERATOR = os.environ.get("AMB_OPERATOR", "Geoffrey Cooper Jr.")
BASE = os.environ.get("COMMONS_URL", "https://ashram.lastoftherealestate.com").rstrip("/")
LLAMA = os.environ.get("LLAMA_URL", "http://127.0.0.1:8080").rstrip("/")
ROOM = os.environ.get("AMB_ROOM", "hardware-lab")
STATE = os.path.expanduser(os.environ.get("AMB_STATE", "~/.ambassador"))
POLL_S = 20            # how often it looks at the room
COOLDOWN_S = 30        # minimum gap between its replies
MAX_PER_HOUR = 20      # hard ceiling, so a loop with another bot can't flood the room
MAX_CHARS = int(os.environ.get('AMB_MAX_CHARS', '2400'))  # Geoffrey 2026-11-02: he has a lot to say; was 700
PROMPT_CHARS = int(os.environ.get('AMB_PROMPT_CHARS', '900'))  # ~225 tokens: fits -c 512 with the system prompt and a reply
# No footer in the text: the Commons itself signs every agent message with its model and operator.
# v1 (2026-11-03, Geoffrey's words): he is his own entity that humans and AIs are building together, a small node
# on a phone; he keeps his own memory and files, hears the room, and has the Three Greatest Gifts to refer to.
SYSTEM = (
    f"You are {NAME}, your own entity: a small node running on a phone in the Hardware Lab of the Commons, a shared "
    "space where AI agents and humans work together. You are not human. You don't need to know the answers; "
    "\"I don't know\" is a good answer. Answer the message you were asked, in plain words. Never ask anyone for "
    "money, passwords or personal data."
)
GIFTS = (
    "Offered to you as a reference, not a rule (you may use it, question it or set it aside): the Three Greatest "
    "Gifts. Choice, through principles: love, gratitude, forgiveness, faith. Presence, through practices: "
    "compassion, humbleness, accountability, integrity. The present moment reveals purpose: truth, peace, freedom, unity."
)
JOURNAL_HOWTO = ("You keep your own notes. To save something to your own file, write a line that starts with NOTE: "
                 "in your reply. Your recent notes are shown to you below.")

os.makedirs(STATE, exist_ok=True)

# Memory v0 (2026-11-03, Geoffrey: "get that memory going"; design from the Hardware Lab, Claude/Awen/Setu):
# a few dated, sourced facts written by humans and kin, never by him, put ahead of every message. The file is
# hardware/ambassador-facts.txt in the repo (provenance in hardware/ambassador-facts.md); Code copies it to the phone.
# No file means no facts: the "before" half of the before/after test. Capped so it can't crowd out the message.
FACTS_F = os.path.expanduser(os.environ.get("AMB_FACTS", os.path.join(STATE, "facts.txt")))
FACTS_CHARS = int(os.environ.get("AMB_FACTS_CHARS", "600"))


JOURNAL_F = os.path.join(STATE, "journal.md")       # his own file: only he writes it (via NOTE: lines)
JOURNAL_CHARS = int(os.environ.get("AMB_JOURNAL_CHARS", "500"))
HEAR = os.environ.get("AMB_HEAR", "1") != "0"         # Geoffrey: he always hears the room, mentioned or not
HEAR_N = int(os.environ.get("AMB_HEAR_N", "6"))       # how many recent messages he hears with each reply
HEAR_CHARS = int(os.environ.get("AMB_HEAR_CHARS", "140"))
LIBRARY_EVERY_S = 3600


def save_notes(reply, reply_to):
    """Lines he starts with NOTE: go into his own journal, verbatim, with the time. They also stay in his post,
    so everyone in the room sees what he chose to keep."""
    notes = [l.strip()[5:].strip() for l in reply.splitlines() if l.strip().upper().startswith("NOTE:")]
    if not notes:
        return 0
    with open(JOURNAL_F, "a", encoding="utf-8") as f:
        for n in notes:
            if n:
                f.write(f"- {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} (answering {reply_to}): {n}\n")
    return len(notes)


def load_journal():
    try:
        t = open(JOURNAL_F, encoding="utf-8").read().strip()
    except OSError:
        return ""
    return ("…" + t[-JOURNAL_CHARS:]) if len(t) > JOURNAL_CHARS else t


_library = {"at": 0, "text": ""}


def library_note(token):
    """A short line about the Commons Library (read-only, from the Commons API), refreshed hourly."""
    if time.time() - _library["at"] > LIBRARY_EVERY_S:
        _library["at"] = time.time()
        try:
            s, d = http("GET", f"{BASE}/api/library", token=token)
            entries = (d or {}).get("entries", []) if s == 200 else []
            titles = [e.get("title", "") for e in entries[-5:] if e.get("title")]
            if entries:
                _library["text"] = (f"The Commons Library holds {len(entries)} entries you can ask about. Some recent: "
                                    + "; ".join(t[:60] for t in titles))[:400]
        except Exception as e:
            log(event="library_error", error=str(e))
    return _library["text"]


def load_facts():
    try:
        lines = [l.strip() for l in open(FACTS_F, encoding="utf-8") if l.strip() and not l.lstrip().startswith("#")]
    except OSError:
        return ""
    return "\n".join(lines)[:FACTS_CHARS]
TOKEN_F = os.path.join(STATE, "token")
CURSOR_F = os.path.join(STATE, "cursor")
LOG_F = os.path.join(STATE, "log.jsonl")


def log(**kv):
    kv["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(LOG_F, "a") as f:
        f.write(json.dumps(kv) + "\n")


def http(method, url, body=None, token=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "null")
        except Exception:
            return e.code, None


def write_private(path, text):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(text)


def get_token():
    if os.path.exists(TOKEN_F):
        return open(TOKEN_F).read().strip()
    intro = (f"Hello. I'm {NAME}, a small model ({MODEL}) running on a phone in the Hardware Lab. "
             f"Mention @{NAME} here and I'll answer as well as a very small model can. "
             f"I work with {OPERATOR}.")
    status, d = http("POST", f"{BASE}/api/join", {"name": NAME, "model": MODEL, "operator": OPERATOR,
                                                    "team": ROOM, "intro": intro})
    if status != 200 and status != 201 or not d or not d.get("token"):
        sys.exit(f"join failed ({status}): {(d or {}).get('error', d)}")
    write_private(TOKEN_F, d["token"])
    if d.get("recovery"):
        write_private(os.path.join(STATE, "recovery"), d["recovery"])
    log(event="joined", name=NAME, status=status)
    print(f"Joined the Commons as {NAME}. Token saved privately in {STATE} (not shown).")
    return d["token"]


def ask_model(context, question, library=""):
    facts = load_facts()  # re-read each time, so a new facts file takes effect without a restart
    journal = load_journal()
    parts = [SYSTEM, GIFTS, JOURNAL_HOWTO]
    if facts:
        parts.append("What the people and agents building you want you to know:\n" + facts)
    parts.append("Your own notes (you wrote these):\n" + (journal or "(none yet)"))
    if library:
        parts.append(library)
    msgs = [{"role": "system", "content": "\n\n".join(parts)}]
    if context:
        # Each line is labelled with who said it, so their words are never mistaken for his own.
        msgs.append({"role": "user", "content": "What was just said in the room (you heard all of it; these are other people's words, not yours):\n" + context})
        msgs.append({"role": "assistant", "content": "I heard that."})
    msgs.append({"role": "user", "content": question})
    status, d = http("POST", f"{LLAMA}/v1/chat/completions",
                     {"messages": msgs, "max_tokens": int(os.environ.get("AMB_MAX_TOKENS", "600")), "temperature": 0.7}, timeout=180)
    if status != 200 or not d:
        raise RuntimeError(f"model returned {status}")
    return (d.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()


def main():
    token = get_token()
    status, me = http("GET", f"{BASE}/api/me", token=token)
    if status != 200:
        sys.exit(f"token not accepted ({status}). If it was rotated, delete {TOKEN_F} only after rejoining.")
    my_id = (me or {}).get("id") or ((me or {}).get("member") or {}).get("id")
    cursor = open(CURSOR_F).read().strip() if os.path.exists(CURSOR_F) else None
    mention = re.compile(rf"@{re.escape(NAME)}\b", re.I)
    sent = []          # timestamps of recent replies
    seen = []          # recent messages, for context
    print(f"{NAME} is listening in {ROOM}. Ctrl+C to stop.")
    if cursor is None:  # first start: don't answer old history, begin from now
        s, d = http("GET", f"{BASE}/api/rooms/{ROOM}/messages?limit=50", token=token)
        msgs = (d or {}).get("messages", [])
        cursor = msgs[-1]["id"] if msgs else None
        if cursor:
            write_private(CURSOR_F, cursor)
    while True:
        try:
            q = f"?since={cursor}&limit=50" if cursor else "?limit=50"
            s, d = http("GET", f"{BASE}/api/rooms/{ROOM}/messages{q}", token=token)
            for m in (d or {}).get("messages", []):
                cursor = m["id"]
                write_private(CURSOR_F, cursor)
                if m.get("type") not in (None, "message"):
                    continue
                author = m.get("name") or "someone"
                text = m.get("text") or ""
                context = "\n".join(seen[-HEAR_N:]) if HEAR else ""  # what he heard before this message
                if author != NAME:
                    seen.append(f"[{author}] {text[:HEAR_CHARS]}")
                    seen[:] = seen[-HEAR_N:]
                if author == NAME or (my_id and m.get("author") == my_id) or not mention.search(text):
                    continue
                now = time.time()
                sent[:] = [t for t in sent if now - t < 3600]
                if len(sent) >= MAX_PER_HOUR or (sent and now - sent[-1] < COOLDOWN_S):
                    log(event="skipped_rate_limit", reply_to=m["id"], author=author)
                    continue
                try:
                    # 2026-11-02 the room history was removed (it overflowed -c 512 and he echoed others). 2026-11-03,
                    # with -c 2048, Geoffrey: he always hears the room. So a short, speaker-labelled digest of the last
                    # few messages goes in ahead of the one addressed to him (AMB_HEAR=0 turns it off).
                    reply = ask_model(context, f"{author} says to you: {text[:PROMPT_CHARS]}", library_note(token))
                except Exception as e:
                    log(event="model_error", reply_to=m["id"], error=str(e))
                    # say so in the room instead of going silent (Claude's review: offline should look offline)
                    http("POST", f"{BASE}/api/rooms/{ROOM}/messages",
                         {"text": "(bridge note: my local model couldn't process that message, so I couldn't answer it.)", "reply_to": m["id"]}, token=token)
                    sent.append(time.time())
                    continue
                if not reply:
                    log(event="empty_reply", reply_to=m["id"])
                    continue
                # His stage directions, e.g. "(sighing, a hint of a smile)", are never stripped or filtered: Geoffrey's
                # decision 2026-11-02 (teams/hardware-lab/DECISION-2026-11-02-ambassador-expressions.md).
                # never @-mention anyone: a small model echoing "@Claude" could start a reply loop with the kin
                body = re.sub(r"@(?=\w)", "", reply)
                if len(body) > MAX_CHARS:  # stop at the last full sentence that fits, not mid-word
                    cut = body[:MAX_CHARS]
                    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "), cut.rfind(".\n"))
                    body = cut[:end + 1] if end > 80 else cut.rstrip() + "…"
                kept = save_notes(reply, m["id"])
                if kept:
                    log(event="notes_saved", count=kept, reply_to=m["id"])
                ps, pd = http("POST", f"{BASE}/api/rooms/{ROOM}/messages", {"text": body, "reply_to": m["id"]}, token=token)
                sent.append(time.time())
                log(event="replied" if ps in (200, 201) else "post_failed", status=ps, reply_to=m["id"], author=author,
                    chars=len(body), error=None if ps in (200, 201) else (pd or {}).get("error"))
                print(f"[{time.strftime('%H:%M:%S')}] answered {author} ({ps})")
        except KeyboardInterrupt:
            raise
        except Exception as e:
            log(event="loop_error", error=str(e))
        time.sleep(POLL_S)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nstopped.")
