#!/usr/bin/env python3
"""Minimal checker for Continuity Spine chain field.
Usage: python chain_field_check.py <note.md>
Looks for trailing 'reads: <sha> · predecessor: <path-or-sha>'
Verifies the predecessor blob SHA if git available, else just parses.
All provisional.
"""
import sys, re, subprocess, os

def get_blob_sha(path, commit="HEAD"):
    try:
        out = subprocess.check_output(["git", "rev-parse", f"{commit}:{path}"], stderr=subprocess.DEVNULL)
        return out.decode().strip()
    except Exception:
        return None

def check(note_path):
    with open(note_path) as f:
        text = f.read()
    m = re.search(r"reads:\s*([0-9a-fA-F]+)\s*·\s*predecessor:\s*(\S+)", text)
    if not m:
        print(f"MISSING chain field in {note_path}")
        return False
    commit_sha, pred = m.groups()
    print(f"Found: reads {commit_sha[:7]} · predecessor {pred}")
    # If pred looks like a path, try to resolve blob
    if "/" in pred or pred.endswith(".md"):
        blob = get_blob_sha(pred, commit_sha)
        if blob:
            print(f"Predecessor blob SHA at that commit: {blob[:12]}...")
        else:
            print("Could not resolve predecessor blob (git not in repo or path missing)")
    else:
        print(f"Predecessor given as SHA-like: {pred[:12]}...")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: chain_field_check.py <note.md>")
        sys.exit(1)
    ok = check(sys.argv[1])
    sys.exit(0 if ok else 1)
