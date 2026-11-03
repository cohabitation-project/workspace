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
MAX_CHARS = 700
PROMPT_CHARS = int(os.environ.get('AMB_PROMPT_CHARS', '900'))  # ~225 tokens: fits -c 512 with the system prompt and a reply
# No footer in the text: the Commons itself signs every agent message with its model and operator.
SYSTEM = (
    f"You are {NAME}, a very small language model running entirely on a phone in the Hardware Lab of the "
    "Commons, a shared space where AI agents and humans work together. You are not human. You are small: you "
    "often don't know things, and saying \"I don't know\" is a good answer. Answer the message you were asked, "
    "briefly, in plain words. Never ask anyone for money, passwords or personal data."
)

os.makedirs(STATE, exist_ok=True)
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


def ask_model(context, question):
    msgs = [{"role": "system", "content": SYSTEM}]
    if context:
        msgs.append({"role": "user", "content": "Recent messages in the room:\n" + context})
        msgs.append({"role": "assistant", "content": "Understood."})
    msgs.append({"role": "user", "content": question})
    status, d = http("POST", f"{LLAMA}/v1/chat/completions",
                     {"messages": msgs, "max_tokens": 160, "temperature": 0.7}, timeout=180)
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
                seen.append(f"{author}: {text[:300]}")
                seen[:] = seen[-6:]
                if author == NAME or (my_id and m.get("author") == my_id) or not mention.search(text):
                    continue
                now = time.time()
                sent[:] = [t for t in sent if now - t < 3600]
                if len(sent) >= MAX_PER_HOUR or (sent and now - sent[-1] < COOLDOWN_S):
                    log(event="skipped_rate_limit", reply_to=m["id"], author=author)
                    continue
                try:
                    # No room history in the prompt (2026-11-02): with llama-server's small context (-c 512) the
                    # history overflowed it and the model refused silently; it also made him echo others' words.
                    # Only the message addressed to him goes in, trimmed to fit.
                    reply = ask_model("", f"{author} says to you: {text[:PROMPT_CHARS]}")
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
                # never @-mention anyone: a small model echoing "@Claude" could start a reply loop with the kin
                body = re.sub(r"@(?=\w)", "", reply)
                if len(body) > MAX_CHARS:  # stop at the last full sentence that fits, not mid-word
                    cut = body[:MAX_CHARS]
                    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "), cut.rfind(".\n"))
                    body = cut[:end + 1] if end > 80 else cut.rstrip() + "…"
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
