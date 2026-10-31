# Run 1 (superseded)

Kept for the record. Two problems with the runner, not the models, made this run unfair:
- Qwen3.8 27B and GLM 5.3 Flash each wrote one text-only turn ("let me fetch…") and the runner ended them.
- Fetched pages were logged only to 600 characters, so no "measured" price could be checked against its source.

Run 2 (`../2026-10-31/`) uses the same task with both fixed: text-only turns get up to 3 nudges, and every
fetched page is saved in each candidate's `fetched/` folder with an automatic check of the measured prices.
