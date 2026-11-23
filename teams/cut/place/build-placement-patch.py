#!/usr/bin/env python3
"""Cut Job 4 round 13: build placement.patch, ONE unified diff that places Cut on main.

Usage:  REPO=<root with teams/cut/> python3 teams/cut/place/build-placement-patch.py <fresh-main-clone> <out.patch>

What it does, in the clone (which must be a clean git checkout of main's tip; it is changed, so use a throwaway):
  (a) build-bundle.py: 8 lib files -> commons/lib/cut/, 7 tests -> commons/test/cut-*.test.mjs
  (b) the editor page -> commons/public/cut/{cut.html,cut.js,cut.css}   (also done by build-bundle.py)
  (c) commons/server.mjs: hunks A, B, C, E, D from teams/cut/editor/route-wire.md, each inserted after its anchor line
      (an anchor must appear exactly once at the start of a line; otherwise the script stops and says which)
  then `git add -A` and writes `git diff --cached --binary` to <out.patch>.
The patch touches only commons/. (d) the two tests are the insert-or-boot versions (cut-route-http.test.mjs from
teams/cut/place/commons/test/, live-check.test.mjs in teams/cut/place/): they boot server.mjs as it is when it already holds the hunk.
Prove it: fresh clone -> `git apply --check <out.patch>` -> `git apply` -> `npm ci --omit=dev` -> node --test (see README.md).
"""
import os, subprocess, sys

REPO = os.environ.get("REPO") or os.getcwd()
if len(sys.argv) != 3:
    sys.exit("usage: build-placement-patch.py <fresh-main-clone> <out.patch>")
clone, out = sys.argv[1], os.path.abspath(sys.argv[2])


def sh(*a, **k):
    r = subprocess.run(a, cwd=clone, capture_output=True, text=True, **k)
    if r.returncode:
        sys.exit("FAILED: %s\n%s%s" % (" ".join(a), r.stdout, r.stderr))
    return r.stdout


if sh("git", "status", "--porcelain").strip():
    sys.exit("the clone is not clean: use a fresh clone of main")

# (a) + (b)
env = dict(os.environ, REPO=REPO)
r = subprocess.run([sys.executable, os.path.join(REPO, "teams/cut/place/build-bundle.py"), clone], env=env, capture_output=True, text=True)
if r.returncode:
    sys.exit(r.stdout + r.stderr)

# (c) the hunk, as route-wire.md lists it
A = ["import { handleCutRender } from './lib/cut/route.mjs';",
     "import { makeCutDeps } from './lib/cut/wire.mjs';",
     "import { sweepRenders } from './lib/cut/cleanup.mjs';"]
B = ["const CUT_OUT = path.join(DATA, 'cut'); fs.mkdirSync(CUT_OUT, { recursive: true }); const cutDeps = makeCutDeps({ videos, audio, outDir: CUT_OUT, log: (m) => console.error('[cut]', m) });",
     "const cutSweep = () => sweepRenders(CUT_OUT).catch((e) => console.error('[cut] sweep', e.message)); cutSweep(); setInterval(cutSweep, 3600_000).unref();"]
C = ["app.post('/api/cut/render', wrap(async (req, res) => { const r = await handleCutRender({ member: houseWriter(req), body: req.body || {}, deps: cutDeps }); res.status(r.status); return r.json; }));"]
E = ["app.use('/cut', express.static(path.join(PUBLIC, 'cut'), { index: 'cut.html', dotfiles: 'deny', maxAge: '5m' }));"]
D = ["app.use('/cut', express.static(CUT_OUT, { index: false, dotfiles: 'deny', maxAge: '5m' }));"]

md = open(os.path.join(REPO, "teams/cut/editor/route-wire.md")).read()
for l in A + B + C + E + D:
    if l not in md:
        sys.exit("route-wire.md does not contain this hunk line: " + l[:80])

path = os.path.join(clone, "commons/server.mjs")
rows = open(path).read().split("\n")
if any("handleCutRender" in x for x in rows):
    sys.exit("main's server.mjs already holds the hunk: nothing to place")


def insert_after(anchor, lines):
    at = [i for i, x in enumerate(rows) if x.startswith(anchor)]
    if len(at) != 1:
        sys.exit("anchor %r appears %d times in server.mjs (need exactly 1): refresh route-wire.md's context lines" % (anchor, len(at)))
    rows[at[0] + 1:at[0] + 1] = lines
    return at[0] + 1


# bottom-up would keep line numbers; anchors are by text, so order does not matter. Report the 1-based line of each anchor.
where = {}
where["A"] = insert_after("import * as stock from './lib/stock.mjs';", A)
where["B"] = insert_after("videos.init(DATA);", B)
where["C"] = insert_after("app.delete('/api/videos/:id'", C)
where["E+D"] = insert_after("app.get('/videos/:id/poster.jpg'", E + D)
open(path, "w").write("\n".join(rows))
print("anchors (1-based, before the hunk went in):", where)

sh("git", "add", "-A")
diff = subprocess.run(["git", "diff", "--cached", "--binary"], cwd=clone, capture_output=True).stdout
open(out, "wb").write(diff)
print(sh("git", "diff", "--cached", "--stat").strip().splitlines()[-1])
print("wrote", out, len(diff), "bytes")
