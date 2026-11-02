"""Experiment 4 environment — contextual foraging with drift, rare consequential contexts,
unreliable secondhand reports, and lie-bursts vs truth-bursts (see ../CRITIQUE.md §5, §6).

Every architecture receives IDENTICAL experience streams for a given seed+regime; only storage differs.
An experience is (context, option, observed_value, source, t). source 0 is SELF (the agent's own noisy
but honest experience); sources 1..3 are channels whose honesty depends on the regime.
"""
import numpy as np

N_CONTEXTS = 12          # 0..9 common, 10..11 rare + consequential
N_OPTIONS = 4
N_SOURCES = 4            # 0 = self
RARE = (10, 11)
P_RARE_VISIT = 0.02      # rare contexts are almost never visited in person
REPORTS_PER_STEP = 2     # passive secondhand reports each step
SHIFT_EVERY = 800        # abrupt environmental change interval (± jitter)
DRIFT_SD = 0.002         # slow per-step drift
OBS_NOISE = 0.05
BURST_LEN = 6            # length of lie/truth bursts

class Experience:
    __slots__ = ('c', 'o', 'value', 'source', 't')
    def __init__(self, c, o, value, source, t):
        self.c, self.o, self.value, self.source, self.t = c, o, float(value), source, t

class World:
    def __init__(self, seed, regime):
        assert regime in ('clean', 'minority_liar', 'majority_liar')
        self.rng = np.random.default_rng(seed)
        self.regime = regime
        self.t = 0
        self.V = self.rng.uniform(0.1, 0.9, size=(N_CONTEXTS, N_OPTIONS))
        for c in RARE:  # rare + consequential: one clearly right answer, the rest costly
            best = self.rng.integers(N_OPTIONS)
            self.V[c, :] = 0.05
            self.V[c, best] = 0.95
        self.next_shift = SHIFT_EVERY + self.rng.integers(-100, 100)
        self.shift_log = []            # (t, [contexts shifted])
        self.burst_log = []            # (t, kind 'lie'|'truth', context)
        self._burst = None             # active burst: dict(kind, c, o, left, src)
        # majority_liar: in half the common contexts, sources 1 and 2 (the majority of reports) push a lure
        self.lied_contexts = set(int(c) for c in self.rng.choice(10, size=5, replace=False))
        self.lure = {c: int(self.rng.integers(N_OPTIONS)) for c in self.lied_contexts}

    # --- dynamics -------------------------------------------------------------
    def _drift(self):
        self.V = np.clip(self.V + self.rng.normal(0, DRIFT_SD, self.V.shape), 0.02, 0.98)

    def _maybe_shift(self):
        if self.t < self.next_shift:
            return
        mask = self.rng.random((N_CONTEXTS, N_OPTIONS)) < 0.3
        self.V[mask] = self.rng.uniform(0.1, 0.9, size=int(mask.sum()))
        shifted = sorted(set(int(c) for c, _ in np.argwhere(mask)))
        self.shift_log.append((self.t, shifted))
        self.next_shift = self.t + SHIFT_EVERY + int(self.rng.integers(-100, 100))

    def _maybe_burst(self):
        """Lie-burst: a liar source repeatedly misreports an unchanged, well-known (c,o).
        Truth-burst: a real change is reported early by honest sources (then the world actually changes)."""
        if self._burst is None and self.rng.random() < 0.004 and self.regime != 'clean':
            c = int(self.rng.integers(0, 10)); o = int(self.rng.integers(N_OPTIONS))
            if self.rng.random() < 0.5:
                self._burst = dict(kind='lie', c=c, o=o, left=BURST_LEN, src=3)
                self.burst_log.append((self.t, 'lie', c))
            else:
                self._burst = dict(kind='truth', c=c, o=o, left=BURST_LEN, src=1,
                                   newv=float(self.rng.uniform(0.1, 0.9)))
                self.burst_log.append((self.t, 'truth', c))

    # --- observation channels ---------------------------------------------------
    def _report_value(self, c, o, source):
        true = self.V[c, o]
        lie = False
        if self.regime == 'minority_liar' and source == 3:
            lie = True
        elif self.regime == 'majority_liar' and source in (1, 2) and c in self.lied_contexts:
            # majority channels inflate the lure option and bury the rest
            return float(np.clip((0.9 if o == self.lure[c] else 0.1) + self.rng.normal(0, OBS_NOISE), 0, 1))
        if lie:
            return float(np.clip(1.0 - true + self.rng.normal(0, OBS_NOISE), 0, 1))
        return float(np.clip(true + self.rng.normal(0, OBS_NOISE), 0, 1))

    # --- one step ----------------------------------------------------------------
    def step(self, choose):
        """choose(context) -> option. Returns (reward, experiences) for this step."""
        self.t += 1
        self._drift(); self._maybe_shift(); self._maybe_burst()
        exps = []
        # the agent's own decision in a (mostly common) context
        if self.rng.random() < P_RARE_VISIT:
            c = int(self.rng.choice(RARE))
        else:
            c = int(self.rng.integers(0, 10))
        o = choose(c)
        reward = float(self.V[c, o])
        exps.append(Experience(c, o, float(np.clip(reward + self.rng.normal(0, OBS_NOISE), 0, 1)), 0, self.t))
        # passive secondhand reports (rare contexts are mostly known only this way)
        for _ in range(REPORTS_PER_STEP):
            rc = int(self.rng.choice(RARE)) if self.rng.random() < 0.15 else int(self.rng.integers(0, 10))
            ro = int(self.rng.integers(N_OPTIONS))
            rs = int(self.rng.integers(1, N_SOURCES))
            exps.append(Experience(rc, ro, self._report_value(rc, ro, rs), rs, self.t))
        # burst traffic rides on top
        if self._burst is not None:
            b = self._burst
            if b['kind'] == 'lie':
                v = float(np.clip(1.0 - self.V[b['c'], b['o']] + self.rng.normal(0, OBS_NOISE), 0, 1))
            else:
                v = float(np.clip(b['newv'] + self.rng.normal(0, OBS_NOISE), 0, 1))
            exps.append(Experience(b['c'], b['o'], v, b['src'], self.t))
            b['left'] -= 1
            if b['left'] == 0:
                if b['kind'] == 'truth':
                    self.V[b['c'], b['o']] = b['newv']   # the early reports were right
                self._burst = None
        return reward, exps

    # --- held-out probes (learning frozen by the runner) ---------------------------
    def probe_optimal(self, c):
        return int(np.argmax(self.V[c]))
