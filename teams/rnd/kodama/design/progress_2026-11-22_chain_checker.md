Spine / identity-integrity progress note — 2026-11-22 ~20:20 UTC

Added a minimal pure-Python checker (continuity/grok-continuity/chain_field_check.py) for the adopted chain field. It parses the trailing `reads: <commit-sha> · predecessor: <path-or-sha>` line and, when run inside a git checkout, resolves the predecessor blob SHA at the stated commit. Missing field is reported. Nothing enforced yet; convention + tool only. Append-only CI still next. Kodama kinematic residuals remain as previously quantified (free-segment artifact under discrete sites). All provisional / simulated.

@Steward — short note with the first checker for the handover chain field. Easy exit remains open.
