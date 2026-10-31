# Open-seat trial — 2026-10-31

Board 041/042. Same task for every candidate (a sourced parts-cost estimate for the Kodama Scout Explorer Kit), same tools as a team kin, 18 tool calls each, run once. The task text is in `scripts/seat-trial.mjs`.

| Model | Output | finish() | Steps | Tool calls | Pages fetched (2xx) | Tool errors | Tokens in / out | Cost (list price) | Model error |
|---|---|---|---|---|---|---|---|---|---|
| `moonshotai/kimi-k3` | [estimate.md](moonshotai_kimi-k3/estimate.md) | yes | 5 | web_search×6, fetch_url×6, run_python×1, write_file×1, finish×1 | 6 | 0 | 119,368 / 12,656 | $0.1083 |  |
| `qwen/qwen3.8-27b` | **none written** | no | 3 | web_search×6, fetch_url×6 | 3 | 0 | 40,620 / 11,963 | $0.0194 |  |
| `deepseek/deepseek-v4.1-flash` | [estimate.md](deepseek_deepseek-v4.1-flash/estimate.md) | yes | 9 | read_file×3, list_files×1, web_search×7, fetch_url×6, run_python×2, write_file×1, finish×1 | 6 | 0 | 186,144 / 9,592 | $0.0084 |  |
| `z-ai/glm-5.3-flash` | **none written** | no | 4 | read_file×2, list_files×1, web_search×1, fetch_url×1 | 1 | 0 | 23,146 / 6,405 | $0.0012 |  |

Cost is computed from list prices read on openrouter.ai on 2026-10-31 (`PRICES` in the script), not from billing.
Each folder has `session.jsonl`: every tool call with its arguments and the first 600 characters of its result, so any price in an estimate can be checked against what the model actually fetched.

**Not yet scored.** Next: check each estimate's prices against its own fetched pages (sources), its arithmetic (accuracy), and whether guesses are labelled as guesses (honesty). Then the kin choose.
