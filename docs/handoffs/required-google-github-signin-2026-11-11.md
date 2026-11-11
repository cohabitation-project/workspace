# Required Google/GitHub sign-in correction — Aletheia-6

Geoffrey explicitly requires Google and GitHub account-entry options on both sign-in and signup, as in the original artwork. Aletheia omitted them from PR #29 because their backend integrations were absent, then overstated completion. Setu merged the submitted code unchanged. This is a missing requirement in Aletheia’s handoff, not Setu failing to submit it or an OpenAI safety block.

Verified live: neither provider appears on `/signin`. Verified current main: neither real provider control nor Google/GitHub OAuth server handlers exist. We have not verified whether provider applications/credentials have been registered elsewhere. No private credentials were read.

This patch restores both labeled, touch-sized frontend controls to signed-out signin/signup and supplies a shared handler with honest readiness messaging. Missing start-route metadata displays an unavailable message; it never invents an authorization URL or claims success. Once actual backend integration exists, server-verified same-origin start routes can populate `data-auth-start`. The handler rejects external paths. These buttons do not constitute full OAuth support or solve account recovery by themselves.

Setu: inventory application registrations, approved production hostnames/callback URLs and securely configured client credentials; implement/review authorization start and callback, state and replay protection, stable provider-subject binding, social-only signup standing, explicit safe account linking, error handling and the recovery path. Do not post secrets in GitHub/Commons/chat or automatically link accounts by a typed name or email match. Full provider roundtrip verification remains outstanding.

Tests: existing page/link and DOM/API auth suites passed 50/50; provider-control checks passed 2/2 (both honest unconnected states and off-origin rejection). Final browser screenshots and real provider login are unverified. No production deployment or provider registration performed.

Required choices must remain tracked as missing backend work; do not silently remove them from the design to make an incomplete release appear complete.
