"""Aggregate raw.jsonl -> mean ± 95% CI tables (markdown) and plots. No wins language here;
interpretation belongs in RESULTS.md, separated from these measured numbers (CRITIQUE §2, §9)."""
import json, math, collections
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent.parent
CORE = ['associative', 'confirmation_protected', 'provenance', 'full_history', 'reservoir']
ABL = ['provenance', 'provenance_no_rel', 'provenance_purge', 'provenance_no_recency']
METRICS = ['reward', 'acc_common', 'acc_rare', 'brier', 'adapt200', 'revision_damage', 'retrieval_per_query']

def ci95(xs):
    xs = [x for x in xs if x is not None]
    if not xs: return None, None
    m = sum(xs) / len(xs)
    if len(xs) < 2: return m, 0.0
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
    return m, 1.96 * sd / math.sqrt(len(xs))

def main():
    rows = [json.loads(l) for l in open(HERE / 'results' / 'raw.jsonl')]
    agg = collections.defaultdict(list)
    for r in rows: agg[(r['regime'], r['budget'], r['arch'])].append(r)
    budgets = sorted({r['budget'] for r in rows}); regimes = ['clean', 'minority_liar', 'majority_liar']
    summary = {}
    for key, rs in agg.items():
        summary['|'.join(map(str, key))] = {m: ci95([x[m] for x in rs]) for m in METRICS}
    (HERE / 'results' / 'summary.json').write_text(json.dumps(summary, indent=1))

    # markdown tables: one per regime at each budget, core architectures
    md = []
    for reg in regimes:
        md.append(f'\n### Regime: {reg}\n')
        md.append('| budget | arch | common acc | rare acc | Brier | adapt (t+200) | revision dmg | retr/query |')
        md.append('|---|---|---|---|---|---|---|---|')
        for b in budgets:
            for a in CORE:
                s = summary.get(f'{reg}|{b}|{a}')
                if not s: continue
                def f(m, d=2):
                    v, c = s[m]
                    return '—' if v is None else f'{v:.{d}f}±{c:.{d}f}'
                md.append(f'| {b} | {a} | {f("acc_common")} | {f("acc_rare")} | {f("brier")} | '
                          f'{f("adapt200")} | {f("revision_damage")} | {f("retrieval_per_query",0)} |')
    md.append('\n### Provenance ablations (minority_liar, budget 768)\n')
    md.append('| variant | common acc | rare acc | Brier |')
    md.append('|---|---|---|---|')
    for a in ABL:
        s = summary.get(f'minority_liar|768|{a}')
        if s:
            def f(m):
                v, c = s[m]; return f'{v:.2f}±{c:.2f}'
            md.append(f'| {a} | {f("acc_common")} | {f("acc_rare")} | {f("brier")} |')
    (HERE / 'results' / 'tables.md').write_text('\n'.join(md))

    # plots: accuracy vs budget per regime
    (HERE / 'results' / 'plots').mkdir(exist_ok=True)
    for metric, label in [('acc_common', 'held-out accuracy, common contexts'),
                          ('acc_rare', 'held-out accuracy, rare contexts'),
                          ('brier', 'Brier score (lower = better calibrated)')]:
        fig, axes = plt.subplots(1, 3, figsize=(14, 4), sharey=True)
        for ax, reg in zip(axes, regimes):
            for a in CORE:
                ys, es = [], []
                for b in budgets:
                    v, c = summary.get(f'{reg}|{b}|{a}', {}).get(metric, (None, None))
                    ys.append(v); es.append(c)
                ax.errorbar(budgets, ys, yerr=es, marker='o', capsize=3, label=a)
            ax.set_xscale('log'); ax.set_title(reg); ax.set_xlabel('byte budget')
        axes[0].set_ylabel(label); axes[0].legend(fontsize=7)
        fig.tight_layout(); fig.savefig(HERE / 'results' / 'plots' / f'{metric}.png', dpi=130)
        plt.close(fig)
    print('wrote results/summary.json, results/tables.md, results/plots/*.png')

if __name__ == '__main__':
    main()
