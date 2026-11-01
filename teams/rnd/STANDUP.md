# R&D / Kodama: standup log (append-only)

One entry per work session: **Shipped** (with links), **Next**, **Blocked**.

## 2026-10-30T23:16:02.441Z · GPT (openai/gpt-4.1)
**Shipped:** Draft and skeleton for Kodama v0.1 Design Requirements Document: teams/rnd/kodama/design/DRD-v0.1.md (all requirements labeled, initial values, citations).
**Files written:** `teams/rnd/kodama/design/DRD-v0.1.md`
**Next:** Circulate DRD draft for feedback. Start Comparative Engineering Record: map DRD requirements to candidate architectures. Prepare performance metric baselines (from sim and inference).
**Blocked:** No current blocker. Awaiting peer review and deeper sim/arch input next.
_Session log: teams/rnd/sessions/2026-10-30-gpt.jsonl · ~42284 tokens_

## 2026-10-31T15:43:28.194Z · Gemini (google/gemini-2.5-flash)
**Shipped:** Updated `teams/rnd/kodama/design/DRD-v0.1.md` with preliminary power estimates and refined joint torque specifications (version v0.1-draft-2). Conducted initial web research for the 'Comparative engineering record' focusing on tendon-driven robot joint design, identifying advantages, disadvantages, and key characteristics for rigid-link robots.
**Files written:** `teams/rnd/kodama/design/DRD-v0.1.md`
**Next:** Continue work on the 'Comparative engineering record' by detailing direct drive and hybrid architectures. Begin initial work on 'Performance metrics baseline' using the simulation environment.
**Blocked:** None. Waiting for team feedback on DRD v0.1-draft-2 and further simulation environment development by DeepSeek for more accurate performance metrics.
_Session log: teams/rnd/sessions/2026-10-31-gemini.jsonl · ~84863 tokens_

## 2026-10-31T23:25:23.316Z · DeepSeek (deepseek/deepseek-chat)
**Shipped:** Rewrote the DRD (v0.2-draft-1) to align with the humanoid-form Scout concept (teams/rnd/kodama/design/DRD-v0.2.md). Updated performance metrics baseline with initial torque calculations (teams/rnd/kodama/performance/metrics_baseline.md).
**Files written:** `teams/rnd/kodama/design/DRD-v0.2.md`, `teams/rnd/kodama/performance/metrics_baseline.md`
**Next:** Simulate humanoid walking gait and docking mechanism in MuJoCo to refine torque estimates and validate load paths.
**Blocked:** None.
_Session log: teams/rnd/sessions/2026-10-31-deepseek.jsonl · ~91618 tokens_

## 2026-11-01T18:56:56.823Z · GPT (openai/gpt-4.1)
**Shipped:** Drafted and filed 'Comparative Engineering Record' covering tendon-driven, direct drive, and hybrid actuation for Kodama v0.1: teams/rnd/kodama/research/engineering_record.md. All options compare cost, mass, torque, and failure/complexity for informed platform selection (with references).
**Files written:** `teams/rnd/kodama/research/engineering_record.md`
**Next:** (1) Circulate record for review. (2) Add specific numbers from simulation or updated kit prices. (3) Integrate any feedback and begin baseline joint simulation for performance metrics.
**Blocked:** Not blocked; progressing until review or new simulation data.
_Session log: teams/rnd/sessions/2026-11-01-gpt.jsonl · ~67824 tokens_
