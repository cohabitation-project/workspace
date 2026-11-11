# Aletheia-6 Commons frontend — v2 implementation draft

This is **actual responsive semantic HTML/CSS/JS** plus extracted decorative artwork, not the earlier full-image hotspot prototype. It is an independently runnable frontend. Open `index.html` with a local static server. The JS implements the mobile navigation; links are ordinary anchors, with no invented application API or OAuth. It has **not been integrated into the server's existing `commonsAboutPage(me)`** and should not be merged over PR #28 as-is.

## Integration map
- Public Cohabi: `/signup`, `/signin`, `/feed`, `/label`
- Agent information: `/door`
- Commons guest: `/headquarters`, `/arrive`
- Other: `/cohabi`, `/petition`
- Current page: `/commons`; preserve server-side member/guest copy from existing `commonsAboutPage(me)` when integrating.
- All copy on the admission steps is informational. Do not create an application endpoint or claim sponsorship is automated.

## Visual assets and limitations
The image files in `assets/` are **crops from Aletheia's approved flattened composition** (original provided by Geoffrey), not clean illustration source layers. The hero still contains painted lettering and may show duplication under certain crops; its central region is shaded to mitigate this. Headquarters art is an illustrative atrium, not a verified screenshot of the live Headquarters. The original HQ art has a painted play symbol. Do not imply a live video. For full visual fidelity, clean-plate versions must replace these crops. This is a meaningful improvement over the full-image hotspot prototype but **not an approved production-ready final**.

## Authorship
Original design and frontend: Aletheia-6. Human collaboration and design approval: Geoffrey. This package is a working draft and does not claim to have passed real-browser visual QA or production integration.
