#!/usr/bin/env bash
# test-deploy.sh: deploy.sh against a throwaway "server" (Aletheia-6's review of #204, 2026-11-17).
#   bash scripts/deploy/test-deploy.sh
# Builds a temp HOME with an origin repo and a live checkout, and puts fake pm2, curl and sleep first on PATH.
# The fake curl answers /healthz from a state file; the fake pm2 "restarts" by making /healthz serve the checkout's
# commit (unless the test marks the app broken). Nothing here touches a real server or a real pm2.
set -uo pipefail
DEPLOY="$(cd "$(dirname "$0")" && pwd)/deploy.sh"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export HOME="$T/home" STATE="$T/state"; mkdir -p "$HOME" "$STATE" "$T/bin"
pass=0; fail=0
ok() { if [ "$2" = "$3" ]; then echo "✓ $1"; pass=$((pass+1)); else echo "✗ $1 — expected $3, got $2"; fail=$((fail+1)); fi; }

# --- fakes ---
cat > "$T/bin/curl" <<'EOF'
#!/usr/bin/env bash
url="${@: -1}"
case "$url" in
  *:3201/voiceroom/state) [ -f "$STATE/voiceroom-dead" ] && exit 7; echo '{"count":0}' ;;
  */healthz) [ -f "$STATE/dead" ] && exit 7; echo "{\"ok\":true,\"sha\":\"$(cat "$STATE/serving" 2>/dev/null)\"}" ;;
  *) exit 7 ;;
esac
EOF
cat > "$T/bin/pm2" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  restart) echo "$2" >> "$STATE/restarts"
           if [ "$2" = commons ] || [ "$2" = commons-staging ]; then
             [ -f "$STATE/broken" ] || { rm -f "$STATE/dead"; git -C "$HOME/workspace" rev-parse HEAD > "$STATE/serving"; }
           fi ;;
  describe) exit 0 ;;
esac
EOF
printf '#!/usr/bin/env bash\nexit 0\n' > "$T/bin/sleep"
printf '#!/usr/bin/env bash\nexit 0\n' > "$T/bin/npm"
chmod +x "$T/bin/"*; export PATH="$T/bin:$PATH"

# --- a server: origin with two commits (the second touches voiceroom), a checkout at the first ---
git init -q --bare "$T/origin.git" -b main
git clone -q "$T/origin.git" "$T/seed" 2>/dev/null
( cd "$T/seed" && git config user.email t@t && git config user.name t && mkdir -p commons/lib && echo a > commons/lib/a.txt && git add -A && git commit -qm c1 && git push -q origin main )
C1="$(git -C "$T/seed" rev-parse HEAD)"
( cd "$T/seed" && echo v > commons/lib/voiceroom.mjs && git add -A && git commit -qm c2 && git push -q origin main )
C2="$(git -C "$T/seed" rev-parse HEAD)"
git clone -q "$T/origin.git" "$HOME/workspace" && git -C "$HOME/workspace" reset -q --hard "$C1"
reset_state() { rm -f "$STATE"/*; echo "$1" > "$STATE/serving"; }
run() { bash "$DEPLOY" "$@" >/dev/null 2>&1; echo $?; }
restarts() { cat "$STATE/restarts" 2>/dev/null | tr '\n' ' ' | sed 's/ $//'; }

# (C) same SHA, healthy: verified green, nothing restarted
reset_state "$C1"
ok "same SHA + healthy → exit 0" "$(run production "$C1")" 0
ok "same SHA + healthy → no restart" "$(restarts)" ""

# (A) same SHA, process dead: fails closed, nothing restarted
reset_state "$C1"; touch "$STATE/dead"
ok "same SHA + dead process → nonzero (6)" "$(run production "$C1")" 6
ok "same SHA + dead process → no restart" "$(restarts)" ""

# (B) same SHA, /healthz serves the wrong commit: fails closed, nothing restarted
reset_state "0000000000000000000000000000000000000000"
ok "same SHA + wrong SHA served → nonzero (6)" "$(run production "$C1")" 6
ok "same SHA + wrong SHA served → no restart" "$(restarts)" ""

# explicit repair: only the operator's third word restarts, and it must come back healthy
reset_state "$C1"; touch "$STATE/dead"
ok "same SHA + dead + 'repair' → exit 0" "$(run production "$C1" repair)" 0
ok "same SHA + dead + 'repair' → restarted commons once" "$(restarts)" "commons"
reset_state "$C1"; touch "$STATE/dead" "$STATE/broken"
ok "repair that doesn't heal → nonzero (1)" "$(run production "$C1" repair)" 1

# a stray third word is refused before anything happens
reset_state "$C1"
ok "unknown third word → refused (2)" "$(run production "$C1" restart)" 2

# (D) changed SHA, healthy: deploys, restarts commons, and (production) voiceroom because its file changed
reset_state "$C1"
ok "changed SHA + healthy → exit 0" "$(run production "$C2")" 0
ok "changed SHA → restarts commons then voiceroom" "$(restarts)" "commons voiceroom"
ok "changed SHA → checkout now at the new commit" "$(git -C "$HOME/workspace" rev-parse HEAD)" "$C2"

# (E) changed SHA, unhealthy: rolls back to the previous commit and fails
git -C "$HOME/workspace" reset -q --hard "$C1"; reset_state "$C1"; touch "$STATE/broken"
ok "changed SHA + unhealthy → nonzero (1)" "$(run production "$C2")" 1
ok "changed SHA + unhealthy → rolled back to the previous commit" "$(git -C "$HOME/workspace" rev-parse HEAD)" "$C1"

echo; echo "$pass passed, $fail failed"; [ "$fail" = 0 ]
