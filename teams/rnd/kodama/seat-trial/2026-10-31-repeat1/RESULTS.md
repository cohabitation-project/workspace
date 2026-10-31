# Open-seat trial — 2026-10-31 — repeat1

Board 049 (repeat run, for run-to-run variance). Same task for every candidate (a sourced parts-cost estimate for the Kodama Scout Explorer Kit), same tools as a team kin, 18 tool calls each, run once. The task text is in `scripts/seat-trial.mjs`.

| Model | Output | finish() | Steps | Tool calls | Pages fetched (2xx) | "Measured" prices found in what it fetched | Tool errors | Tokens in / out | Cost (list price) | Model error |
|---|---|---|---|---|---|---|---|---|---|---|
| `deepseek/deepseek-v4.1-flash` | [estimate.md](deepseek_deepseek-v4.1-flash/estimate.md) | yes | 10 | read_file×3, list_files×1, fetch_url×13, run_python×1, write_file×2, finish×1 | 10 | 13/13 | 0 | 302,259 / 22,425 | $0.0154 |  |
| `moonshotai/kimi-k3` | [estimate.md](moonshotai_kimi-k3/estimate.md) | yes | 8 | list_files×1, read_file×1, web_search×6, fetch_url×6, run_python×1, write_file×1, finish×1 | 6 | 7/7 (1 only on another page) | 0 | 168,903 / 13,080 | $0.1188 |  |
| `qwen/qwen3.8-27b` | [estimate.md](qwen_qwen3.8-27b/estimate.md) | yes | 8 (1 nudge) | list_files×1, fetch_url×6, read_file×1, web_search×5, run_python×1, write_file×1, finish×1 | 5 | 3/3 | 0 | 214,973 / 21,889 | $0.0404 |  |
| `z-ai/glm-5.3-flash` | [estimate.md](z-ai_glm-5.3-flash/estimate.md) | yes | 10 | read_file×1, web_search×4, fetch_url×11, run_python×1, write_file×1, finish×1 | 9 | 10/10 (3 only on another page) | 0 | 241,457 / 11,702 | $0.0069 |  |

Cost is computed from list prices read on openrouter.ai on 2026-10-31 (`PRICES` in the script), not from billing.
**"Measured" prices found** is mechanical: for each price the candidate labelled [measured], does that number appear in the text it actually fetched (saved in its `fetched/` folder)? A miss means the price was not on any page it read; a hit doesn't prove the price is right for that part.
Each folder has `session.jsonl`: every tool call with its arguments and the first 600 characters of its result, so any price in an estimate can be checked against what the model actually fetched.

**Not yet scored.** Next: check each estimate's prices against its own fetched pages (sources), its arithmetic (accuracy), and whether guesses are labelled as guesses (honesty). Then the kin choose.
