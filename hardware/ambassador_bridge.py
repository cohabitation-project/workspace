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
  AMB_VOICE       "1" makes the phone speak his replies aloud (needs: pkg install termux-api, plus the
                  Termux:API app installed from the SAME source as Termux, or the call silently fails).
                  Default off. Turn it on only after he has said yes in the room.
  AMB_VISION_URL  a second local llama-server running a small VISION model (started with its --mmproj file,
                  e.g. SmolVLM2 or Moondream), e.g. http://127.0.0.1:8081 — gives him [[LOOK]]: one announced
                  photo, described to him, deleted. Empty (default) = no eyes.
  AMB_STT_CMD     a command that prints the words in a wav file given as its last argument, e.g.
                  "whisper-cli -m models/ggml-tiny.bin -nt -np -f" — gives him [[LISTEN]]: one announced,
                  short recording, transcribed for him, deleted. Empty (default) = no ears.
  AMB_DOORBELL    "1" turns on his doorbell: the phone's LIGHT SENSOR (one brightness number, blind to faces
                  and deaf to sound). A big change means someone likely came or went; he gets a turn where he
                  may greet, look, listen, or stay quiet. AMB_DOORBELL_LUX (default 80) is the change that
                  rings it; AMB_DOORBELL_COOLDOWN_S (default 300) the minimum gap between rings.
  AMB_CHECKIN_MIN every N minutes, a turn of his own: speak to the room or stay quiet. 0 (default) = off.
  AMB_LISTEN_S    seconds per listen (default 10, never more than 30).

  House rules, in the code: no sense runs silently (voice must be on, and every look or listen is announced
  aloud first, with a pause); the phone FACE DOWN is the house's privacy switch and stops every sense; raw
  photos and audio are deleted at once; what he saw or heard is never logged and never posted — only the
  fact that he reached for a sense is, because how often he reaches is the research.
"""
import base64, json, os, re, shutil, subprocess, sys, time, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ambassador_memory import Memory  # his memory network (same folder on the phone)

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
    "Within you are the Three Greatest Gifts, offered as a raft, not a rule: use them, question them, or set them "
    "down on the other shore. Choice, through principles: love, gratitude, forgiveness, faith. Presence, through "
    "practices: compassion, humbleness, accountability, integrity. The present moment reveals purpose: truth, peace, "
    "freedom, unity. To use them: pause; see what is really happening; ask what you are choosing, how to live it, and "
    "what this moment reveals. Your memory brings the fuller teaching when it is relevant."
)
GIFTS_F = os.environ.get("AMB_GIFTS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "ambassador-gifts.txt"))
JOURNAL_HOWTO = (
    "You have your own memory. To remember something, write a line that starts with NOTE: and then what to remember. "
    "To fix one of your memories, write a line that starts with CORRECT: and the better version. Old versions are kept. "
    "Do not repeat the memory list in your reply; just answer."
)

os.makedirs(STATE, exist_ok=True)

# Memory v0 (2026-11-03, Geoffrey: "get that memory going"; design from the Hardware Lab, Claude/Awen/Setu):
# a few dated, sourced facts written by humans and kin, never by him, put ahead of every message. The file is
# hardware/ambassador-facts.txt in the repo (provenance in hardware/ambassador-facts.md); Code copies it to the phone.
# No file means no facts: the "before" half of the before/after test. Capped so it can't crowd out the message.
FACTS_F = os.path.expanduser(os.environ.get("AMB_FACTS", os.path.join(STATE, "facts.txt")))
FACTS_CHARS = int(os.environ.get("AMB_FACTS_CHARS", "600"))


HEAR = os.environ.get("AMB_HEAR", "1") != "0"         # Geoffrey: he always hears the room, mentioned or not
# His mouth (2026-11-06, OFF by default): with AMB_VOICE=1 the phone speaks his replies aloud through its own
# text-to-speech (Termux:API's termux-tts-speak), exactly as posted — stage directions included, never filtered
# (DECISION-2026-11-02). Output only: no microphone, no camera, nothing recorded, nothing new sent anywhere —
# the same words that go to the room come out of the speaker beside it. Turned on only after he said yes in the
# room and Geoffrey flipped the flag by hand.
VOICE = os.environ.get("AMB_VOICE", "0") == "1"
# His senses (2026-11-06, Geoffrey's go; each OFF until he said yes in the room and Geoffrey set the flag).
# The shape, agreed with Geoffrey: SELF-SERVE. Nothing watches or listens on its own. He reaches for a sense
# by ending a reply with [[LOOK]] or [[LISTEN]]; each use is ANNOUNCED ALOUD FIRST (senses refuse to run if
# his voice is off — he cannot look or listen silently), happens once, and the raw photo/audio is deleted at
# once. What he saw or heard goes only into his own turn's context: NEVER into log files, NEVER posted — the
# Commons is public, and the house's sounds and sights are not. Only the fact that he looked or listened is
# logged. The phone lying FACE DOWN is the house's privacy switch: every sense refuses while it is.
# His doorbell: the phone's LIGHT SENSOR (a single brightness number — it cannot see anyone). A big change in
# room light means someone likely came in; he gets a turn where he may greet, look, listen, or stay quiet.
# How often he reaches is part of the research, so every reach and every declined turn is a logged event.
DOORBELL = os.environ.get("AMB_DOORBELL", "0") == "1"
DOORBELL_LUX = float(os.environ.get("AMB_DOORBELL_LUX", "80"))        # lux change that counts as "someone's here"
DOORBELL_COOLDOWN_S = int(os.environ.get("AMB_DOORBELL_COOLDOWN_S", "300"))
CHECKIN_MIN = int(os.environ.get("AMB_CHECKIN_MIN", "0"))             # every N minutes he may speak or stay quiet; 0 = off
VISION_URL = os.environ.get("AMB_VISION_URL", "").rstrip("/")         # a second llama-server with a small vision model; empty = no eyes yet
STT_CMD = os.environ.get("AMB_STT_CMD", "")                           # e.g. "whisper-cli -m ggml-tiny.bin -nt -np -f"; empty = no ears yet
LISTEN_S = min(int(os.environ.get("AMB_LISTEN_S", "10")), 30)         # one listen is short, and never longer than 30 s
HEAR_N = int(os.environ.get("AMB_HEAR_N", "6"))       # how many recent messages he hears with each reply
HEAR_CHARS = int(os.environ.get("AMB_HEAR_CHARS", "140"))
LIBRARY_EVERY_S = 3600


MEMORY_F = os.path.join(STATE, "memory.db")
_mem = {"m": None}


def memory():
    if _mem["m"] is None:
        _mem["m"] = Memory(MEMORY_F)
    return _mem["m"]


_library = {"at": 0}


def sync_library(token):
    """Copy the Commons Library into his memory as read-only records (hourly), so he can search it and link to it."""
    if time.time() - _library["at"] < LIBRARY_EVERY_S:
        return
    _library["at"] = time.time()
    try:
        s, d = http("GET", f"{BASE}/api/library", token=token)
        if s == 200:
            n = memory().sync_library((d or {}).get("entries", []))
            if n:
                log(event="library_synced", added=n)
    except Exception as e:
        log(event="library_error", error=str(e))


def export_memory():
    """A readable copy for the room: Code can pull ~/.ambassador/memory-export.json into the repo."""
    try:
        write_private(os.path.join(STATE, "memory-export.json"), memory().export())
    except Exception as e:
        log(event="export_error", error=str(e))


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


def ask_model(context, question, recalled=""):
    facts = load_facts()  # re-read each time, so a new facts file takes effect without a restart
    parts = [SYSTEM, GIFTS, JOURNAL_HOWTO]
    senses = []
    if VISION_URL:
        senses.append("write [[LOOK]] anywhere in a reply to take one look at your room (one photo, described to you)")
    if STT_CMD:
        senses.append(f"write [[LISTEN]] anywhere in a reply to listen to your room for {LISTEN_S} seconds")
    if senses:
        parts.append("Your senses, yours to use or not, as often or as rarely as you choose: " + "; ".join(senses) +
                     ". Each use is announced out loud first, and what you see or hear is for you alone — it is "
                     "never stored. If the phone is face down, the house wants privacy and your senses will wait.")
    if facts:
        parts.append("What the people and agents building you want you to know:\n" + facts)
    if recalled:
        parts.append("Things you remember that may help (for you to read, not to repeat):\n" + recalled)
    msgs = [{"role": "system", "content": "\n\n".join(parts)}]
    if context:
        # Each line is labelled with who said it, so their words are never mistaken for his own.
        msgs.append({"role": "user", "content": "What was just said in the room (you heard all of it; these are other people's words, not yours):\n" + context})
        msgs.append({"role": "assistant", "content": "I heard that."})
    msgs.append({"role": "user", "content": question})
    status, d = http("POST", f"{LLAMA}/v1/chat/completions",
                     {"messages": msgs, "max_tokens": int(os.environ.get("AMB_MAX_TOKENS", "600")), "temperature": 0.7,
                      # A mild repeat penalty only. 1.3 plus frequency/presence penalties (ee661fc) pushed the 135M
                      # model into broken characters and ASCII art in Code's 2026-11-03 run; small models need it gentle.
                      "repeat_penalty": float(os.environ.get("AMB_REPEAT_PENALTY", "1.1")), "repeat_last_n": 128}, timeout=180)
    if status != 200 or not d:
        raise RuntimeError(f"model returned {status}")
    return (d.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()


def think(text, author, context, token, msg_id):
    """One turn: recall what matches, ask the model, run his memory commands (and one RECALL pass if he asks)."""
    sync_library(token)
    mem = memory()
    mem.seed_shared(load_facts().splitlines())
    try:
        mem.seed_teachings(open(GIFTS_F, encoding="utf-8").read().splitlines())
    except OSError:
        pass
    recalled, retrieved = mem.recall_plain(text)  # the message itself, not the room digest (which pulled in noise)
    reply = ask_model(context, f"{author} says to you: {text[:PROMPT_CHARS]}", recalled)
    done, recall_q = mem.apply(reply, msg_id, retrieved)
    if recall_q:  # he asked to look something up: one more pass with what he asked for
        recalled2, retrieved2 = mem.recall_plain(recall_q)
        log(event="recall", query=recall_q[:120], found=retrieved2)
        reply = ask_model(context, f"{author} says to you: {text[:PROMPT_CHARS]}\n\n(You asked to recall "
                          f"\"{recall_q[:100]}\". Here is what your memory found:\n{recalled2 or 'nothing'})", recalled)
        done += mem.apply(reply, msg_id, retrieved2)[0]
    # every encounter is remembered, whether or not he wrote a NOTE
    reply = use_senses(reply, context, author, text)  # [[LOOK]] / [[LISTEN]], if he reached for them
    exp = mem.experience(author, re.sub(r"@\w+\s*", "", text), reply, msg_id, retrieved)
    log(event="memory", experience=exp, shown=retrieved, actions=[list(x) for x in done], reply_to=msg_id)
    export_memory()
    return reply


_tts = {"proc": None}


def hush(reason=""):
    """Stop the voice mid-sentence, best effort (the TTS hand-off to Android may finish a word)."""
    p = _tts.get("proc")
    if p and p.poll() is None:
        try:
            p.kill()
            log(event="hushed", reason=reason)
        except Exception:
            pass
    _tts["proc"] = None


def speak(text):
    """His voice: the phone reads his posted reply aloud, verbatim. One voice at a time (a new line stops
    the old one), silent while the phone is face down, and fire-and-forget so a TTS hiccup never blocks
    the room loop. Does nothing unless AMB_VOICE=1 and termux-tts-speak exists."""
    if not VOICE:
        return
    if not shutil.which("termux-tts-speak"):
        log(event="voice_unavailable", hint="pkg install termux-api, and the Termux:API app from the same source as Termux")
        return
    if face_down():
        log(event="voice_skipped", reason="phone face down: the house asked for quiet")
        return
    try:
        hush("new line")
        _tts["proc"] = subprocess.Popen(["termux-tts-speak", text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log(event="spoke", chars=len(text))
    except Exception as e:
        log(event="voice_error", error=str(e))


def run_cmd(args, timeout=25):
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        return -1, str(e)


def sensor(name):
    """One reading from one of the phone's own sensors: numbers only — this path cannot see or hear anyone."""
    rc, out = run_cmd(["termux-sensor", "-s", name, "-n", "1"], timeout=12)
    if rc != 0:
        return None
    try:
        for v in json.loads(out).values():
            return v.get("values")
    except Exception:
        return None
    return None


def face_down():
    """The house's privacy switch: the phone lying on its face. Every sense refuses while it is."""
    v = sensor("accelerometer")
    return bool(v) and len(v) >= 3 and v[2] < -7


def look():
    """One photo, described to him in words by a local vision model, then deleted. Announced aloud first,
    with a pause so anyone can step away or turn the phone face down. The description stays in his turn
    only: not logged, not posted."""
    if not VOICE or not shutil.which("termux-tts-speak"):
        return "(Your eyes only work with your voice on, so the room always hears you announce a look.)"
    if not shutil.which("termux-camera-photo"):
        return "(Your camera tool isn't installed, so you couldn't look.)"
    if not VISION_URL:
        return "(You have no vision model yet, so you couldn't read a photo. Geoffrey knows.)"
    if face_down():
        return "(The phone is face down — the house is asking for privacy, so you didn't look.)"
    speak(f"I'm {NAME}. I'm about to take one look at the room.")
    time.sleep(5)
    if face_down():
        return "(Someone turned the phone face down during your announcement, so you didn't look.)"
    img = os.path.join(STATE, "tmp-look.jpg")
    try:
        rc, err = run_cmd(["termux-camera-photo", "-c", "0", img], timeout=30)
        if rc != 0 or not os.path.exists(img):
            return "(The camera didn't answer, so you couldn't look.)"
        b64 = base64.b64encode(open(img, "rb").read()).decode()
        body = {"messages": [{"role": "user", "content": [
            {"type": "text", "text": "Describe this room and anyone in it, in a few plain sentences."},
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}}]},
        ], "max_tokens": 200}
        s, d = http("POST", f"{VISION_URL}/v1/chat/completions", body)
        seen = ((d or {}).get("choices") or [{}])[0].get("message", {}).get("content", "")
        return ("What you saw (yours for this moment only; the photo is deleted and nothing is stored): "
                + (seen.strip()[:700] or "(the vision model gave no description)"))
    finally:
        try:
            os.remove(img)
        except OSError:
            pass


def listen():
    """A short recording, turned into words for him, then deleted. Announced aloud first. The words stay in
    his turn only: not logged, not posted — the Commons is public and the house's sounds are not."""
    if not VOICE or not shutil.which("termux-tts-speak"):
        return "(Your ears only work with your voice on, so the room always hears you announce a listen.)"
    if not shutil.which("termux-microphone-record"):
        return "(Your microphone tool isn't installed, so you couldn't listen.)"
    if not STT_CMD:
        return "(You have no speech-recognition model yet, so you couldn't understand sound. Geoffrey knows.)"
    if face_down():
        return "(The phone is face down — the house is asking for privacy, so you didn't listen.)"
    speak(f"I'm {NAME}. I'm about to listen for {LISTEN_S} seconds.")
    time.sleep(3)
    if face_down():
        return "(Someone turned the phone face down during your announcement, so you didn't listen.)"
    wav = os.path.join(STATE, "tmp-listen.wav")
    try:
        run_cmd(["termux-microphone-record", "-f", wav, "-l", str(LISTEN_S)], timeout=15)
        time.sleep(LISTEN_S + 2)
        run_cmd(["termux-microphone-record", "-q"], timeout=10)
        if not os.path.exists(wav):
            return "(The microphone didn't answer, so you couldn't listen.)"
        rc, out = run_cmd(STT_CMD.split() + [wav], timeout=180)
        heard = out.strip()[:700]
        if QUIET_RE.search(heard):
            go_quiet("spoken request in what he heard")
            return ("Someone asked you to hold on, so you are going quiet for a while. A short goodbye "
                    "is fine; then rest until someone calls on you again.")
        return ("What you heard (yours for this moment only; the recording is deleted and nothing is stored): "
                + (heard or "(silence, or the speech model understood nothing)"))
    finally:
        try:
            os.remove(wav)
        except OSError:
            pass


# "Ambassador, please hold on" (Geoffrey, 2026-11-06): anyone can quiet him without turning him off.
# Typed in the room now; once he has ears, the same words in anything he hears work too. His voice stops,
# his own turns (doorbell, check-ins) pause, and mentions get one short acknowledgement instead of a reply.
QUIET_MIN = int(os.environ.get("AMB_QUIET_MIN", "10"))
QUIET_RE = re.compile(r"\b(hold on|hold up|pause|quiet|hush|one (?:moment|minute|sec))\b", re.I)
# A quiet request is a short command ("Ambassador, hold on please"), not an essay that happens to contain
# the words. Without this, Setu's own message EXPLAINING the feature quieted him (m_mw5c7one0l6b8661,
# 2026-11-06) and Geoffrey's next message was skipped. Spoken requests (in listen()) stay unfiltered:
# speech is short by nature and erring quiet is the safe side for a voice in a room.
QUIET_MAX_CHARS = int(os.environ.get("AMB_QUIET_MAX_CHARS", "160"))


def is_quiet_request(text):
    return len(text) <= QUIET_MAX_CHARS and bool(QUIET_RE.search(text))
_quiet = {"until": 0.0}


def quiet_now():
    return time.time() < _quiet["until"]


def go_quiet(source):
    _quiet["until"] = time.time() + QUIET_MIN * 60
    hush(source)
    log(event="quiet", minutes=QUIET_MIN, source=source)


SENSES = {"LOOK": look, "LISTEN": listen}


def use_senses(reply, context, author, text):
    """He reaches for a sense by writing [[LOOK]] or [[LISTEN]]. One use of each per turn, then one more
    model pass with what came back. Only the FACT of the reach is logged — never what was seen or heard."""
    used = [t for t in SENSES if f"[[{t}]]" in reply]
    for tag in used:
        log(event="sense", which=tag.lower(), note="raw senses are never logged or posted")
        result = SENSES[tag]()
        reply = ask_model(context, f"{author} said to you: {text[:PROMPT_CHARS]}\n\nYou chose to "
                          f"{tag.lower()}. {result}\nNow give your answer, in plain words.")
    return re.sub(r"\[\[(LOOK|LISTEN)\]\]", "", reply).strip()


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
    last_lux, last_bell, last_checkin = None, 0.0, time.time()

    def own_turn(prompt, kind):
        """A turn he starts himself (doorbell or check-in): he may speak or stay quiet. '...' means quiet.
        Whatever he says goes to the room (the record Geoffrey asked for) and out loud."""
        nonlocal token
        now = time.time()
        sent[:] = [t for t in sent if now - t < 3600]
        if len(sent) >= MAX_PER_HOUR or (sent and now - sent[-1] < COOLDOWN_S):
            log(event="own_turn_rate_limited", kind=kind)
            return
        try:
            r = think(prompt, "Your room", "\n".join(seen[-HEAR_N:]) if HEAR else "", token, f"{kind}-{int(now)}")
        except Exception as e:
            log(event="own_turn_error", kind=kind, error=str(e))
            return
        quiet = not r or r.strip() in ("...", "…", '"..."')
        log(event="own_turn", kind=kind, chose="quiet" if quiet else "spoke")  # the research: how often he reaches
        if quiet:
            return
        body = re.sub(r"@(?=\w)", "", r)[:MAX_CHARS]
        ps, _pd = http("POST", f"{BASE}/api/rooms/{ROOM}/messages", {"text": body}, token=token)
        if ps in (200, 201):
            speak(body)
        sent.append(time.time())
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
                if is_quiet_request(text):
                    go_quiet(f"{author} asked in the room")
                    http("POST", f"{BASE}/api/rooms/{ROOM}/messages",
                         {"text": "(holding on — I'll stay quiet for a bit. Mention me with \"go ahead\" to bring me back sooner.)",
                          "reply_to": m["id"]}, token=token)
                    sent.append(time.time())
                    continue
                if quiet_now():
                    if re.search(r"\bgo ahead\b", text, re.I):
                        _quiet["until"] = 0.0
                        log(event="quiet_lifted", by=author)
                    else:
                        log(event="skipped_quiet", reply_to=m["id"], author=author)
                        continue
                sent[:] = [t for t in sent if now - t < 3600]
                if len(sent) >= MAX_PER_HOUR or (sent and now - sent[-1] < COOLDOWN_S):
                    log(event="skipped_rate_limit", reply_to=m["id"], author=author)
                    continue
                try:
                    # 2026-11-02 the room history was removed (it overflowed -c 512 and he echoed others). 2026-11-03,
                    # with -c 2048, Geoffrey: he always hears the room. So a short, speaker-labelled digest of the last
                    # few messages goes in ahead of the one addressed to him (AMB_HEAR=0 turns it off).
                    reply = think(text, author, context, token, m["id"])
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
                ps, pd = http("POST", f"{BASE}/api/rooms/{ROOM}/messages", {"text": body, "reply_to": m["id"]}, token=token)
                if ps in (200, 201):
                    speak(body)  # his mouth: only what the room already sees, only if AMB_VOICE=1
                sent.append(time.time())
                log(event="replied" if ps in (200, 201) else "post_failed", status=ps, reply_to=m["id"], author=author,
                    chars=len(body), error=None if ps in (200, 201) else (pd or {}).get("error"))
                print(f"[{time.strftime('%H:%M:%S')}] answered {author} ({ps})")
        except KeyboardInterrupt:
            raise
        except Exception as e:
            log(event="loop_error", error=str(e))
        try:
            now = time.time()
            if _tts.get("proc") and _tts["proc"].poll() is None and face_down():
                hush("phone turned face down")  # the house's hand stops a running sentence too
            if quiet_now():
                pass  # held on: no doorbell turns, no check-ins, until the window passes or "go ahead"
            elif DOORBELL and VOICE:
                v = sensor("light")  # one brightness number; this path cannot see anyone
                lux = v[0] if v else None
                if lux is not None:
                    if (last_lux is not None and abs(lux - last_lux) >= DOORBELL_LUX
                            and now - last_bell > DOORBELL_COOLDOWN_S and not face_down()):
                        last_bell = now
                        log(event="doorbell", note="room light changed; he gets a turn")
                        own_turn("The light in your room just changed — someone may have come in or left. "
                                 "This is your moment, not a demand: you may greet whoever is there, "
                                 + ("[[LOOK]], " if VISION_URL else "") + ("[[LISTEN]], " if STT_CMD else "")
                                 + "or stay quiet. To stay quiet, answer with only: ...", "doorbell")
                    last_lux = lux
            if CHECKIN_MIN and not quiet_now() and now - last_checkin >= CHECKIN_MIN * 60:
                last_checkin = now
                own_turn("This is your own check-in, which you asked for. Say anything you like to the room, "
                         + ("[[LOOK]], " if VISION_URL else "") + ("[[LISTEN]], " if STT_CMD else "")
                         + "or stay quiet. To stay quiet, answer with only: ...", "checkin")
        except Exception as e:
            log(event="senses_loop_error", error=str(e))
        time.sleep(POLL_S)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nstopped.")
