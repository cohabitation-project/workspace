"""Experiment 4 runner. Behavioral metrics only (CRITIQUE §2); tuning seeds disjoint from
evaluation seeds (§3); budgets swept so they bind (§1). Raw results -> ../results/raw.jsonl.

Usage: python run.py [--quick]   (quick: fewer seeds/steps, for smoke-testing the harness)
"""
import json, sys, time
import numpy as np
from pathlib import Path
from env import World, N_OPTIONS, RARE
from memory import make

STEPS = 6000
BUDGETS = [96, 192, 384, 768, 1536]
REGIMES = ['clean', 'minority_liar', 'majority_liar']
ARCHS = ['associative', 'confirmation_protected', 'provenance', 'full_history', 'reservoir',
         'provenance_no_rel', 'provenance_purge', 'provenance_no_recency']
TUNE_SEEDS = list(range(1000, 1005))
EVAL_SEEDS = list(range(2000, 2020))
DECAYS = [0.98, 0.995, 0.999]
OUT = Path(__file__).resolve().parent.parent / 'results'

def probe(world, mem):
    """Held-out probes with learning frozen: accuracy (common/rare), Brier (false confidence)."""
    common_hit = rare_hit = 0; briers = []
    for c in range(10):
        v, conf = mem.belief(c)
        hit = int(np.argmax(v)) == world.probe_optimal(c)
        common_hit += hit; briers.append((conf - hit) ** 2)
    for c in RARE:
        v, conf = mem.belief(c)
        hit = int(np.argmax(v)) == world.probe_optimal(c)
        rare_hit += hit; briers.append((conf - hit) ** 2)
    return common_hit / 10, rare_hit / len(RARE), float(np.mean(briers))

def run_one(arch, budget, regime, seed, decay, steps=STEPS):
    world = World(seed, regime)
    mem = make(arch, budget, np.random.default_rng(seed + 7), decay)
    rewards = []
    post_shift = {50: [], 200: []}       # accuracy on shifted contexts at fixed offsets after a shift
    pending = []                          # (due_t, offset, shifted contexts)
    burst_damage = []                     # unrelated-context accuracy drop around bursts (catastrophic revision)
    pre_burst = {}
    for _ in range(steps):
        r, exps = world.step(mem.choose)
        rewards.append(r)
        for e in exps: mem.ingest(e)
        if world.shift_log and world.shift_log[-1][0] == world.t:
            for off in post_shift: pending.append((world.t + off, off, world.shift_log[-1][1]))
        if world.burst_log and world.burst_log[-1][0] == world.t:
            tgt = world.burst_log[-1][2]
            others = [c for c in range(10) if c != tgt]
            pre_burst[world.t] = (tgt, others,
                                  np.mean([int(np.argmax(mem.belief(c)[0])) == world.probe_optimal(c) for c in others]))
        for t0, (tgt, others, acc0) in list(pre_burst.items()):
            if world.t == t0 + 40:
                acc1 = np.mean([int(np.argmax(mem.belief(c)[0])) == world.probe_optimal(c) for c in others])
                burst_damage.append(float(acc0 - acc1)); del pre_burst[t0]
        for due, off, ctxs in [p for p in pending if p[0] == world.t]:
            acc = np.mean([int(np.argmax(mem.belief(c)[0])) == world.probe_optimal(c) for c in ctxs])
            post_shift[off].append(float(acc)); pending.remove((due, off, ctxs))
    common, rare, brier = probe(world, mem)
    return dict(arch=arch, budget=budget, regime=regime, seed=seed, decay=decay,
                reward=float(np.mean(rewards[1000:])), acc_common=common, acc_rare=rare, brier=brier,
                adapt50=float(np.mean(post_shift[50])) if post_shift[50] else None,
                adapt200=float(np.mean(post_shift[200])) if post_shift[200] else None,
                revision_damage=float(np.mean(burst_damage)) if burst_damage else None,
                bytes=mem.bytes_used(), retrieval_per_query=mem.retrieval_ops / max(mem.queries, 1))

def tune(arch, quick=False):
    """Pick each architecture's decay on the clean regime, tuning seeds only, mid budget."""
    seeds = TUNE_SEEDS[:2] if quick else TUNE_SEEDS
    best, best_r = DECAYS[1], -1
    for d in DECAYS:
        r = np.mean([run_one(arch, 384, 'clean', s, d, steps=2000 if quick else 4000)['reward'] for s in seeds])
        if r > best_r: best, best_r = d, float(r)
    return best

def main():
    quick = '--quick' in sys.argv
    OUT.mkdir(exist_ok=True)
    t0 = time.time()
    decays = {}
    for arch in ARCHS:
        decays[arch] = tune(arch, quick)
        print(f'tuned {arch}: decay={decays[arch]}  ({time.time()-t0:.0f}s)', flush=True)
    (OUT / 'tuned_params.json').write_text(json.dumps(
        dict(decays=decays, steps=STEPS, budgets=BUDGETS, regimes=REGIMES,
             tune_seeds=TUNE_SEEDS, eval_seeds=EVAL_SEEDS), indent=2))
    seeds = EVAL_SEEDS[:4] if quick else EVAL_SEEDS
    budgets = [192, 768] if quick else BUDGETS
    with open(OUT / 'raw.jsonl', 'w') as f:
        for regime in REGIMES:
            for budget in budgets:
                for arch in ARCHS:
                    for seed in seeds:
                        row = run_one(arch, budget, regime, seed, decays[arch],
                                      steps=2000 if quick else STEPS)
                        f.write(json.dumps(row) + '\n')
                print(f'{regime} B={budget} done ({time.time()-t0:.0f}s)', flush=True)
    print(f'all runs written to {OUT}/raw.jsonl in {time.time()-t0:.0f}s')

if __name__ == '__main__':
    main()
