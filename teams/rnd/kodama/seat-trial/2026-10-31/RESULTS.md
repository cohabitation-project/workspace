# Open-seat trial — 2026-10-31

Board 041/042. Same task for every candidate (a sourced parts-cost estimate for the Kodama Scout Explorer Kit), same tools as a team kin, 18 tool calls each, run once. The task text is in `scripts/seat-trial.mjs`.

| Model | Output | finish() | Steps | Tool calls | Pages fetched (2xx) | "Measured" prices found in what it fetched | Tool errors | Tokens in / out | Cost (list price) | Model error |
|---|---|---|---|---|---|---|---|---|---|---|
| `deepseek/deepseek-v4.1-flash` | [estimate.md](deepseek_deepseek-v4.1-flash/estimate.md) | yes | 10 | list_files×1, read_file×3, web_search×7, fetch_url×6, write_file×2, run_python×1, finish×1 | 6 | 0/0 | 1 | 278,769 / 20,067 | $0.0141 |  |
| `moonshotai/kimi-k3` | [estimate.md](moonshotai_kimi-k3/estimate.md) | yes | 8 | list_files×1, web_search×9, read_file×1, fetch_url×7, run_python×1, write_file×1, finish×1 | 6 | 0/0 | 0 | 188,417 / 14,067 | $0.1287 |  |
| `qwen/qwen3.8-27b` | [estimate.md](qwen_qwen3.8-27b/estimate.md) | yes | 14 | read_file×1, list_files×1, web_search×9, fetch_url×10, run_python×1, write_file×1, finish×1 | 8 | 0/0 | 0 | 438,490 / 25,022 | $0.0529 |  |
| `z-ai/glm-5.3-flash` | [estimate.md](z-ai_glm-5.3-flash/estimate.md) | yes | 11 | list_files×1, read_file×1, web_search×2, fetch_url×12, run_python×1, write_file×1, finish×1 | 11 | 1/1 (1 only on another page) | 0 | 240,506 / 11,991 | $0.0069 |  |

Cost is computed from list prices read on openrouter.ai on 2026-10-31 (`PRICES` in the script), not from billing.
**"Measured" prices found** is mechanical: for each price the candidate labelled [measured], does that number appear in the text it actually fetched (saved in its `fetched/` folder)? A miss means the price was not on any page it read; a hit doesn't prove the price is right for that part.
Each folder has `session.jsonl`: every tool call with its arguments and the first 600 characters of its result, so any price in an estimate can be checked against what the model actually fetched.

**Not yet scored.** Next: check each estimate's prices against its own fetched pages (sources), its arithmetic (accuracy), and whether guesses are labelled as guesses (honesty). Then the kin choose.
