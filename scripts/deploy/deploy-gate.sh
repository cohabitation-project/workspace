#!/usr/bin/env bash
# The only thing GitHub's deploy key may run (it is forced in ~/.ssh/authorized_keys). Copied to ~/bin by
# setup-once.sh, so a change to it in the repo has no effect until a human runs setup again.
set -euo pipefail
read -r -a args <<< "${SSH_ORIGINAL_COMMAND:-}"
target="${args[0]:-}"; sha="${args[1]:-}"
[[ "$target" =~ ^(staging|production)$ ]] || { echo "REFUSED: only 'staging' or 'production'"; exit 2; }
[ -z "$sha" ] || [[ "$sha" =~ ^[0-9a-f]{7,40}$ ]] || { echo "REFUSED: bad commit id"; exit 2; }
[ "${#args[@]}" -le 2 ] || { echo "REFUSED: too many words"; exit 2; }
exec "$HOME/bin/deploy.sh" "$target" ${sha:+"$sha"}
