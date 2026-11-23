#!/usr/bin/env python3
"""Build the Cut Job 4 placement bundle from teams/cut/editor + teams/cut/render/wrap.mjs.

Usage:  python3 teams/cut/place/build-bundle.py <target-checkout-root>
Copies 8 lib files to <target>/commons/lib/cut/ and 6 test files to <target>/commons/test/cut-<name>.test.mjs.
The ONLY edits are import specifiers (listed in README.md). It never touches server.mjs.
Run from the repo root of a checkout that has teams/cut/ (or pass REPO=<root> in the environment).
"""
import os, re, sys, shutil

REPO = os.environ.get("REPO") or os.getcwd()
target = sys.argv[1] if len(sys.argv) > 1 else None
if not target:
    sys.exit("usage: build-bundle.py <target-checkout-root>")
E = os.path.join(REPO, "teams/cut/editor")
WRAP = os.path.join(REPO, "teams/cut/render/wrap.mjs")
L = os.path.join(target, "commons/lib/cut")
T = os.path.join(target, "commons/test")
os.makedirs(L, exist_ok=True)
os.makedirs(T, exist_ok=True)

LIBS = ["edit", "render-edit", "render-job", "route", "cleanup", "wire", "render-child"]
TESTS = ["edit", "render-edit", "render-job", "route", "route-real", "cleanup"]
NAMES = "|".join(LIBS + ["wrap"])

WRAP_OLD = 'import { estimateTextWidth, LINE_HEIGHT_FACTOR } from "../render/wrap.mjs";'
WRAP_NEW = 'import { estimateTextWidth, LINE_HEIGHT_FACTOR } from "./wrap.mjs";'
PLAN_OLD = 'import { buildRenderPlan } from "../../../commons/lib/cut/plan.mjs";'
PLAN_NEW = 'import { buildRenderPlan } from "./plan.mjs";'


def lib(name):
    s = open(os.path.join(E, name + ".mjs")).read()
    if name == "edit":
        assert WRAP_OLD in s
        s = s.replace(WRAP_OLD, WRAP_NEW)
    if name == "render-edit":
        assert PLAN_OLD in s
        s = s.replace(PLAN_OLD, PLAN_NEW)
    return s


def test(name):
    s = open(os.path.join(E, name + ".test.mjs")).read()
    s = s.replace('"../../../commons/lib/cut/plan.mjs"', '"../lib/cut/plan.mjs"')
    s = re.sub(r'(["\'])\./(' + NAMES + r')\.mjs\1', r"\1../lib/cut/\2.mjs\1", s)
    return s


for n in LIBS:
    open(os.path.join(L, n + ".mjs"), "w").write(lib(n))
shutil.copy(WRAP, os.path.join(L, "wrap.mjs"))
for n in TESTS:
    open(os.path.join(T, "cut-%s.test.mjs" % n), "w").write(test(n))
# Round 10: the booted-server test lives in the bundle tree itself (it is written for commons/test/, no import changes).
HTTP_TEST = os.path.join(REPO, "teams/cut/place/commons/test/cut-route-http.test.mjs")
if os.path.exists(HTTP_TEST):
    shutil.copy(HTTP_TEST, os.path.join(T, "cut-route-http.test.mjs"))
    print("also wrote cut-route-http.test.mjs")
print("wrote 8 lib files to", L, "and 6 tests to", T)
# Round 13: the editor page (hunk E mounts commons/public/cut/ at /cut). Copied byte for byte; cut.html names ./cut.js and ./cut.css.
P = os.path.join(target, "commons/public/cut")
os.makedirs(P, exist_ok=True)
for f in ("cut.html", "cut.js", "cut.css"):
    shutil.copy(os.path.join(E, f), os.path.join(P, f))
print("wrote cut.html, cut.js, cut.css to", P)
