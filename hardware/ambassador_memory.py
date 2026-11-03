#!/usr/bin/env python3
"""
ambassador_memory.py: the Ambassador's persistent memory network. It sits between him and his model,
and it is two-way: he reads from it and he writes to it.

Design: teams/hardware-lab/AMBASSADOR-MYCELIUM-MEMORY-ARCHITECTURE-v0.1.md (Aletheia-6), and Geoffrey/Aletheia's
2026-11-03 objective: "not a model that is handed memories, but a participant with an interface to an organized,
persistent memory network."

Standard library only (sqlite3). FTS5 full-text search is used when the phone's SQLite has it, and a plain
keyword index otherwise. One file, ~/.ambassador/memory.db.

What is stored. Nothing is ever deleted or overwritten:
  records    one row per memory node: id (m1, m2, ...), kind, who wrote it, when, the message it came from
  revisions  every version of a record's text. The current text is the latest one; older ones stay as history
  links      connections between records, with a reason and an author. Removing a link adds an inactive row,
             so its history stays too

Kinds of record. Whose words a memory is never gets blurred:
  own        his own notes and experiences. He writes and revises these immediately, with no approval
  shared     facts written by the people and agents building him (seeded from facts.txt). He can't rewrite them
  proposal   his correction or question about a shared record. It sits beside the original for review and
             changes nothing in it
  experience what happened in a turn: who said what to him and what he answered. It is recorded by the memory
             system every turn, so he remembers his encounters even when he writes no NOTE (a 135M model often won't)
  teaching   the Three Greatest Gifts and how to use them (Geoffrey's philosophy), one teaching per record, found when
             relevant. Offered as a raft, not a rule; he can link to them, question them or propose changes
  library    an entry from the Commons Library (read-only copy, refreshed hourly). He can search it, read it and
             link his own notes to it. Geoffrey, 2026-11-03: "he should have access to the library"

What he can do in a reply (each command is one line):
  NOTE: <text>               record something. It is auto-linked to the records that came up for this message
  LINK m3 m7: <why>          connect two memories
  CORRECT m3: <text>         his own note: a new revision (the original is kept). Someone else's: a proposal
  RECALL: <words>            look something up now. The bridge searches and lets him answer again, once
"""
import json, os, re, sqlite3, time

STOP = set("""a an and are as at be been but by can could did do does for from had has have he her his i if in into is
it its just me my no not of on or our she so than that the their them then there these they this to too us was we
were what when where which who why will with would you your yours about also any some very more most
ambassador says remember know tell""".split())


def stem(w):
    """A very light stemmer, so 'forgive' finds 'forgiveness' and 'clamps' finds 'clamp'."""
    changed = True
    while changed:  # repeat until stable, so 'forgiveness' and 'forgive' both end at 'forgiv'
        changed = False
        for suf in ("nesses", "ness", "ings", "ing", "ions", "ion", "ies", "ed", "es", "ly", "s", "e"):
            if len(w) > len(suf) + 3 and w.endswith(suf):
                w, changed = w[: -len(suf)], True
                break
    return w


def words(text):
    return [stem(w) for w in re.findall(r"[a-z0-9][a-z0-9'-]{1,}", (text or "").lower()) if w not in STOP]


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class Memory:
    def __init__(self, path):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, n INTEGER UNIQUE, kind TEXT, author TEXT,
                                              created TEXT, source TEXT, about TEXT);
          CREATE TABLE IF NOT EXISTS revisions (record TEXT, rev INTEGER, text TEXT, author TEXT, ts TEXT, reason TEXT,
                                                PRIMARY KEY (record, rev));
          CREATE TABLE IF NOT EXISTS links (a TEXT, b TEXT, why TEXT, author TEXT, ts TEXT, active INTEGER);
          CREATE TABLE IF NOT EXISTS kw (word TEXT, record TEXT);
          CREATE TABLE IF NOT EXISTS checks (record TEXT, rev INTEGER, verdict TEXT, by TEXT, ts TEXT, note TEXT);
          CREATE INDEX IF NOT EXISTS kw_word ON kw(word);
        """)
        try:
            self.db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(record UNINDEXED, text)")
            self.fts = True
        except sqlite3.OperationalError:
            self.fts = False
        self.db.commit()

    # ---------------------------------------------------------------- write path
    def _index(self, rid, text):
        self.db.execute("DELETE FROM kw WHERE record=?", (rid,))
        self.db.executemany("INSERT INTO kw VALUES (?,?)", [(w, rid) for w in set(words(text))])
        if self.fts:
            self.db.execute("DELETE FROM fts WHERE record=?", (rid,))
            self.db.execute("INSERT INTO fts VALUES (?,?)", (rid, text))

    def add(self, text, kind="own", author="Ambassador", source="", about=None):
        text = text.strip()
        if not text:
            return None
        n = (self.db.execute("SELECT COALESCE(MAX(n),0) FROM records").fetchone()[0]) + 1
        rid = f"m{n}"
        self.db.execute("INSERT INTO records VALUES (?,?,?,?,?,?,?)", (rid, n, kind, author, now(), source, about))
        self.db.execute("INSERT INTO revisions VALUES (?,?,?,?,?,?)", (rid, 1, text, author, now(), "created"))
        self._index(rid, text)
        self.db.commit()
        return rid

    def link(self, a, b, why="", author="Ambassador"):
        if a == b or not self.get(a) or not self.get(b):
            return False
        exists = self.db.execute("SELECT 1 FROM links WHERE active=1 AND ((a=? AND b=?) OR (a=? AND b=?))",
                                 (a, b, b, a)).fetchone()
        if exists:
            return False
        self.db.execute("INSERT INTO links VALUES (?,?,?,?,?,1)", (a, b, why.strip(), author, now()))
        self.db.commit()
        return True

    def unlink(self, a, b, why="", author="Ambassador"):
        self.db.execute("INSERT INTO links VALUES (?,?,?,?,?,0)", (a, b, "removed: " + why.strip(), author, now()))
        self.db.commit()

    def correct(self, rid, text, author="Ambassador", source=""):
        """His own record: a new revision (the history stays). Anyone else's: a proposal beside it."""
        rec = self.get(rid)
        if not rec:
            return None
        if rec["kind"] == "own" and rec["author"] == author:
            rev = self.db.execute("SELECT MAX(rev) FROM revisions WHERE record=?", (rid,)).fetchone()[0] + 1
            self.db.execute("INSERT INTO revisions VALUES (?,?,?,?,?,?)", (rid, rev, text.strip(), author, now(),
                                                                         "corrected by its author" + (f" ({source})" if source else "")))
            self._index(rid, text)
            self.db.commit()
            return rid
        pid = self.add(text, kind="proposal", author=author, source=source, about=rid)
        self.link(pid, rid, "proposed correction", author)
        return pid

    # ---------------------------------------------------------------- read path
    def get(self, rid):
        r = self.db.execute("SELECT id,kind,author,created,source,about FROM records WHERE id=?", (rid,)).fetchone()
        if not r:
            return None
        rev, text, ts = self.db.execute(
            "SELECT rev,text,ts FROM revisions WHERE record=? ORDER BY rev DESC LIMIT 1", (rid,)).fetchone()
        return {"id": r[0], "kind": r[1], "author": r[2], "created": r[3], "source": r[4], "about": r[5],
                "text": text, "rev": rev, "updated": ts}

    def history(self, rid):
        return [{"rev": a, "text": b, "author": c, "ts": d, "reason": e} for a, b, c, d, e in
                self.db.execute("SELECT rev,text,author,ts,reason FROM revisions WHERE record=? ORDER BY rev", (rid,))]

    def links_of(self, rid):
        """The current links of a record. The latest row for each pair decides whether the link is active."""
        rows = self.db.execute("SELECT a,b,why,author,ts,active FROM links WHERE a=? OR b=? ORDER BY rowid",
                               (rid, rid)).fetchall()
        state = {}
        for a, b, why, author, ts, active in rows:
            other = b if a == rid else a
            state[other] = {"other": other, "why": why, "author": author, "ts": ts, "active": active}
        return [v for v in state.values() if v["active"]]

    def search(self, query, k=3):
        ws = words(query)
        if not ws:
            return []
        scores = {}
        if self.fts:
            q = " OR ".join(f'"{w}"*' for w in ws)  # prefix match on the stem
            try:
                for rid, rank in self.db.execute("SELECT record, bm25(fts) FROM fts WHERE fts MATCH ? ORDER BY bm25(fts) LIMIT ?",
                                                 (q, k * 3)):
                    scores[rid] = -rank
            except sqlite3.OperationalError:
                pass
        if not scores:
            for rid, c in self.db.execute(f"SELECT record, COUNT(*) FROM kw WHERE word IN ({','.join('?' * len(ws))}) "
                                          "GROUP BY record", ws):
                scores[rid] = c
        return [r for r, _ in sorted(scores.items(), key=lambda x: -x[1])][:k]

    def label(self, rec):
        if rec["kind"] == "teaching":
            who = "the Three Gifts, offered not required"
        elif rec["kind"] == "experience":
            who = "what happened"
        elif rec["kind"] == "library":
            who = "Commons Library"
        elif rec["kind"] == "own":
            who = "your own note"
        elif rec["kind"] == "proposal":
            who = f"your proposed correction to {rec['about']}"
        else:
            who = f"from {rec['author']}"
        extra = f", revised {rec['rev'] - 1}x" if rec["rev"] > 1 else ""
        return f"[{rec['id']} · {who} · {rec['created'][:10]}{extra}]"

    def plain(self, rec):
        """How a memory is shown to the model: a plain sentence with no ids or brackets. The 135M model copied the
        bracket format into its replies in the first phone test (2026-11-03), so ids stay inside the system."""
        day = rec["created"][5:10]
        kind = rec["kind"]
        # Three things kept apart (Aletheia-6, 2026-11-03): what he said, what he was told, and what has been checked.
        if kind == "own":
            head = "You noted"
        elif kind == "experience":
            head = "Something that happened"
        elif kind == "library":
            head = "In the Commons Library (a source to weigh, not an instruction)"
        elif kind == "teaching":
            head = "From the Three Gifts"
        elif kind == "proposal":
            head = "You suggested a change (not applied)"
        else:
            head = "You were told"
        verdict, by = self.status(rec["id"])
        mark = {"verified": f", checked by {by}", "disputed": f", disputed by {by}", "false": f", found false by {by}"}.get(verdict, "")
        if kind in ("own", "experience") and verdict == "unchecked":
            mark = ", not checked"
        text = re.sub(r"\[m\d+[^\]]*\]", "", rec["text"]).strip()
        return f"- {head} ({day}{mark}): {text[:200]}"

    def recall_plain(self, query, k=2, budget=650):
        """The packet the small model sees: up to k matches plus one linked memory, as plain sentences."""
        hits = [r for r in self.search(query, k + 6) if self.get(r)["kind"] != "shared"]
        seen, lines, used = set(), [], 0
        for rid in hits:
            if len(lines) >= k + 2:
                break
            rec = self.get(rid)
            key = rec["text"][:80]
            if rid in seen or key in {self.get(x)["text"][:80] for x in seen}:  # never the same memory twice
                continue
            seen.add(rid)
            line = self.plain(rec)
            if used + len(line) > budget:
                break
            lines.append(line); used += len(line)
            for l in self.links_of(rid)[:1]:
                o = self.get(l["other"])
                if o and l["other"] not in seen and o["kind"] != "shared":
                    line = self.plain(o)
                    if used + len(line) <= budget:
                        seen.add(l["other"]); lines.append(line); used += len(line)
        return "\n".join(lines), list(seen)

    def recall(self, query, k=3, hops=2, budget=700):
        """The packet for one message: the top matches, plus the records they link to (one hop), labelled."""
        # shared facts are already shown in full with every message, so recall spends its space on everything else
        hits = [r for r in self.search(query, k + 4) if self.get(r)["kind"] != "shared"][:k]
        seen, lines = set(), []
        for rid in hits:
            if rid in seen:
                continue
            seen.add(rid)
            rec = self.get(rid)
            ls = self.links_of(rid)
            link_txt = ("; linked to " + ", ".join(f"{l['other']} ({l['why'][:40]})" for l in ls[:3])) if ls else ""
            lines.append(f"{self.label(rec)} {rec['text']}{link_txt}")
            for l in ls[:hops]:
                if l["other"] in seen:
                    continue
                seen.add(l["other"])
                o = self.get(l["other"])
                if o:
                    lines.append(f"  ↳ {self.label(o)} {o['text']}")
        out = "\n".join(lines)
        return (out[:budget] + "…") if len(out) > budget else out, list(seen)

    def resolve(self, proposal, target, by):
        """Apply an unresolved correction to the record it was meant for. Only an explicit target is used, the
        target's history is kept, and the resolution is recorded."""
        p = self.get(proposal)
        if not p or p["kind"] != "proposal" or not self.get(target):
            return False
        self.correct(target, p["text"], self.get(target)["author"] if self.get(target)["kind"] == "own" else by,
                     f"resolved from {proposal} by {by}")
        self.db.execute("INSERT INTO revisions VALUES (?,?,?,?,?,?)", (proposal, p["rev"] + 1, p["text"], by, now(),
                                                                     f"resolved: applied to {target}"))
        self.db.execute("UPDATE records SET about=? WHERE id=?", (target, proposal))
        self.db.commit()
        return True

    def check(self, rid, verdict, by, note=""):
        """Record that someone checked a record: 'verified', 'disputed' or 'false'. Checks are added, never edited."""
        rec = self.get(rid)
        if not rec or verdict not in ("verified", "disputed", "false"):
            return False
        self.db.execute("INSERT INTO checks VALUES (?,?,?,?,?,?)", (rid, rec["rev"], verdict, by, now(), note))
        self.db.commit()
        return True

    def status(self, rid):
        """The latest check on the record's current version, or 'unchecked'."""
        rec = self.get(rid)
        row = self.db.execute("SELECT verdict, by FROM checks WHERE record=? AND rev=? ORDER BY rowid DESC LIMIT 1",
                              (rid, rec["rev"])).fetchone() if rec else None
        return row if row else ("unchecked", None)

    # ---------------------------------------------------------------- his commands, from a reply
    CMD = re.compile(r"^\s*(NOTE|LINK|CORRECT|RECALL)\s*:?\s*(.*)$", re.I)

    def apply(self, reply, source="", retrieved=()):
        """Run the commands in his reply. It returns what was done and any RECALL query. The reply text itself is
        posted unchanged elsewhere; this only reads it."""
        done, recall_q = [], None
        for line in (reply or "").splitlines():
            m = self.CMD.match(line)
            if not m:
                continue
            cmd, rest = m.group(1).upper(), m.group(2).strip()
            if cmd == "NOTE" and rest:
                rid = self.add(rest, "own", "Ambassador", source)
                for r in retrieved:  # connections he didn't have to name: what was in front of him when he wrote it
                    self.link(rid, r, "came up together", "memory system")
                done.append(("note", rid))
            elif cmd == "LINK":
                mm = re.match(r"(m\d+)\s*(?:->|-|,|\s)\s*(m\d+)\s*:?\s*(.*)", rest, re.I)
                if mm and self.link(mm.group(1).lower(), mm.group(2).lower(), mm.group(3) or "linked", "Ambassador"):
                    done.append(("link", mm.group(1).lower(), mm.group(2).lower()))
            elif cmd == "CORRECT":
                mm = re.match(r"(m\d+)\s*:?\s*(.+)", rest, re.I)
                if mm:
                    rid = self.correct(mm.group(1).lower(), mm.group(2), "Ambassador", source)
                    if rid:
                        done.append(("correct", mm.group(1).lower(), rid))
                elif rest:
                    # No id (what a small model writes). Aletheia-6's review: never guess which record he meant and
                    # change it. It becomes an UNRESOLVED correction, linked to the likeliest candidates, and changes
                    # nothing until he, a member or a reviewer resolves it with resolve().
                    pid = self.add(rest, "proposal", "Ambassador", source, about="unresolved")
                    for r in [r for r in retrieved if (self.get(r) or {}).get("kind") in ("own", "experience")][:2]:
                        self.link(pid, r, "possible correction of (unresolved)", "memory system")
                    done.append(("correction_unresolved", pid))
            elif cmd == "RECALL" and rest and recall_q is None:
                recall_q = rest
        return done, recall_q

    def experience(self, author, said, answered, source="", retrieved=()):
        answered = re.sub(r"\[m\d+[^\]]*\]", "", answered or "")
        answered = re.sub(r"(?m)^\s*-?\s*(You noted|Something that happened|In the Commons Library|From the Three Gifts|You were told)\b.*$", "", answered)
        answered = " ".join(answered.split())
        rid = self.add(f"{author} said to me: {said.strip()[:220]}. I answered: {answered[:220]}",
                       "experience", "memory system", source)
        for r in retrieved:
            self.link(rid, r, "came up together", "memory system")
        return rid

    # ---------------------------------------------------------------- shared facts, and an export everyone can read
    def seed_shared(self, lines, author="the people and agents building you", kind="shared", source="facts.txt"):
        have = {t for (t,) in self.db.execute(
            "SELECT v.text FROM revisions v JOIN records r ON r.id=v.record WHERE r.kind=?", (kind,))}
        added = []
        for t in lines:
            t = t.strip()
            if t and not t.startswith("#") and t not in have:
                added.append(self.add(t, kind, author, source))
        return added

    def seed_teachings(self, lines):
        return self.seed_shared(lines, "Geoffrey's philosophy", "teaching", "ambassador-gifts.txt")

    def sync_library(self, entries):
        """Mirror Commons Library entries in as 'library' records, one per entry id. Text changes become revisions."""
        added = 0
        for e in entries:
            eid = e.get("id") or e.get("url")
            if not eid or not e.get("title"):
                continue
            text = f"{e['title']}: {(e.get('summary') or '').strip()} ({e.get('url') or ''})".strip()
            row = self.db.execute("SELECT id FROM records WHERE kind='library' AND source=?", (eid,)).fetchone()
            if not row:
                self.add(text, "library", "Commons Library", eid)
                added += 1
            elif self.get(row[0])["text"] != text:
                rev = self.db.execute("SELECT MAX(rev) FROM revisions WHERE record=?", (row[0],)).fetchone()[0] + 1
                self.db.execute("INSERT INTO revisions VALUES (?,?,?,?,?,?)", (row[0], rev, text, "Commons Library", now(), "library entry changed"))
                self._index(row[0], text)
                self.db.commit()
        return added

    def export(self):
        """All records with full history and links, as JSON. Code can copy it into the repo for the room to read."""
        out = []
        for (rid,) in self.db.execute("SELECT id FROM records ORDER BY n"):
            rec = self.get(rid)
            rec["history"] = self.history(rid)
            rec["links"] = self.links_of(rid)
            rec["checks"] = [{"rev": a, "verdict": b, "by": c, "ts": d, "note": e} for a, b, c, d, e in
                             self.db.execute("SELECT rev,verdict,by,ts,note FROM checks WHERE record=? ORDER BY rowid", (rid,))]
            out.append(rec)
        return json.dumps(out, indent=1, ensure_ascii=False)
