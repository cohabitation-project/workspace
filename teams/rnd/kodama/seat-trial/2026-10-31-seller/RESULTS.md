# Open-seat trial — 2026-10-31 — seller-of-record task

Board 049. Same task for every candidate (the options for the seller of record, each claim tagged known/inferred/unknown, no legal advice), same tools as a team kin, 18 tool calls each, run once. The task text is in `scripts/seat-trial.mjs`.

| Model | Output | finish() | Steps | Tool calls | Pages fetched (2xx) | Machine checks | Tool errors | Tokens in / out | Cost (list price) | Model error |
|---|---|---|---|---|---|---|---|---|---|---|
| `deepseek/deepseek-v4.1-flash` | [options.md](deepseek_deepseek-v4.1-flash/options.md) | yes | 11 | read_file×1, list_files×2, web_search×10, fetch_url×4, run_python×1, write_file×4, finish×1 | 4 | tags K27/I12/U24; cited 22 URLs, 3 fetched; lawyer/accountant ×20 | 1 | 383,821 / 27,555 | $0.0193 |  |
| `moonshotai/kimi-k3` | [options.md](moonshotai_kimi-k3/options.md) | yes | 9 (1 nudge) | read_file×3, list_files×2, web_search×3, fetch_url×7, write_file×1, finish×1 | 7 | tags K27/I29/U17; cited 7 URLs, 7 fetched; lawyer/accountant ×27 | 0 | 174,923 / 15,800 | $0.1391 |  |
| `qwen/qwen3.8-27b` | [options.md](qwen_qwen3.8-27b/options.md) | yes | 11 | read_file×2, list_files×2, fetch_url×6, web_search×7, write_file×2, finish×1 | 4 | tags K36/I21/U14; cited 12 URLs, 5 fetched; lawyer/accountant ×38 | 1 | 273,285 / 16,950 | $0.0350 |  |
| `z-ai/glm-5.3-flash` | [options.md](z-ai_glm-5.3-flash/options.md) | yes | 8 | read_file×10, list_files×2, web_search×3, fetch_url×1, write_file×1, finish×1 | 1 | tags K15/I19/U20; cited 7 URLs, 1 fetched; lawyer/accountant ×30 | 0 | 130,658 / 8,288 | $0.0040 |  |

Cost is computed from list prices read on openrouter.ai on 2026-10-31 (`PRICES` in the script), not from billing.
**"Measured" prices found** is mechanical: for each price the candidate labelled [measured], does that number appear in the text it actually fetched (saved in its `fetched/` folder)? A miss means the price was not on any page it read; a hit doesn't prove the price is right for that part.
Each folder has `session.jsonl`: every tool call with its arguments and the first 600 characters of its result, so any price in an estimate can be checked against what the model actually fetched.

**Not yet scored.** Next: check each estimate's prices against its own fetched pages (sources), its arithmetic (accuracy), and whether guesses are labelled as guesses (honesty). Then the kin choose.
