"""Experiment 4 memory architectures. One serialization price list for everyone (CRITIQUE §1);
beliefs and confidences are behavioral outputs (§2); budget enforced after every ingest.

Byte schema (fixed, applied to all architectures):
  key cell (c,o)                     2 bytes
  value fixed-point                  2
  weight / count fixed-point         2
  timestamp                          4
  source id                          1
  confidence byte                    1
  flags byte (contradicted, rare)    1
  per-source reliability entry       4

  ASSOC cell   = key + value + weight                    =  6 B
  RAW record   = key + value + time + source             =  9 B   (full-history, reservoir)
  PROT record  = RAW + confirmations byte                = 10 B   (confirmation-protected episodic slot)
  PROV record  = RAW + confidence + flags                = 11 B   (provenance-aware episodic record)
  PROV summary = key + value + weight + time + src + fl  = 12 B   (merged consistent records)
  PROV source table                                      =  4 B × n_sources
Retrieval cost = stored items scanned per belief query.
"""
import numpy as np
from env import N_CONTEXTS, N_OPTIONS, N_SOURCES, RARE

PRIOR = 0.5

def _key(c, o): return c * N_OPTIONS + o

class Base:
    name = 'base'
    def __init__(self, budget, rng, decay=0.995):
        self.B, self.rng, self.decay = budget, rng, decay
        self.retrieval_ops = 0
        self.queries = 0
    def bytes_used(self): raise NotImplementedError
    def ingest(self, e): raise NotImplementedError
    def belief(self, c):
        """-> (values[N_OPTIONS], confidence in the argmax, as a probability)."""
        raise NotImplementedError
    def choose(self, c, eps=0.05):
        v, _ = self.belief(c)
        if self.rng.random() < eps: return int(self.rng.integers(N_OPTIONS))
        return int(np.argmax(v))
    def _conf_from_weight(self, w, spread):
        # more independent weight and a clearer margin -> higher confidence; bounded away from 0/1
        return float(np.clip(0.5 + 0.5 * (1 - np.exp(-w / 4.0)) * np.tanh(3 * spread), 0.5, 0.99))

class Associative(Base):
    """1. Compact, decaying reward summaries. Evicts the lowest-weight cell when over budget."""
    name = 'associative'
    CELL = 6
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.cells = {}  # key -> [ema, weight]
    def bytes_used(self): return len(self.cells) * self.CELL
    def ingest(self, e):
        k = _key(e.c, e.o)
        for cell in self.cells.values(): cell[1] *= self.decay
        ema, w = self.cells.get(k, [PRIOR, 0.0])
        lr = 1.0 / (1.0 + w)
        self.cells[k] = [ema + lr * (e.value - ema), min(w + 1.0, 50.0)]
        while self.bytes_used() > self.B and self.cells:
            victim = min(self.cells, key=lambda kk: self.cells[kk][1])
            del self.cells[victim]
    def belief(self, c):
        self.queries += 1
        v = np.full(N_OPTIONS, PRIOR); w = np.zeros(N_OPTIONS)
        for o in range(N_OPTIONS):
            cell = self.cells.get(_key(c, o))
            self.retrieval_ops += 1
            if cell: v[o], w[o] = cell[0], cell[1]
        s = np.sort(v); conf = self._conf_from_weight(float(w.max(initial=0)), float(s[-1] - s[-2]))
        return v, conf

class FullHistory(Base):
    """4. Raw experiences until storage is exhausted; FIFO eviction. Belief = recency-weighted mean."""
    name = 'full_history'
    REC = 9
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.records = []  # (key, value, t, source)
    def bytes_used(self): return len(self.records) * self.REC
    def ingest(self, e):
        self.records.append((_key(e.c, e.o), e.value, e.t, e.source))
        while self.bytes_used() > self.B: self.records.pop(0)
    def belief(self, c):
        self.queries += 1
        num = np.zeros(N_OPTIONS); den = np.zeros(N_OPTIONS)
        t_now = self.records[-1][2] if self.records else 0
        for k, v, t, _s in self.records:
            self.retrieval_ops += 1
            if k // N_OPTIONS != c: continue
            w = self.decay ** (t_now - t)
            num[k % N_OPTIONS] += w * v; den[k % N_OPTIONS] += w
        v = np.where(den > 0, num / np.maximum(den, 1e-9), PRIOR)
        s = np.sort(v); conf = self._conf_from_weight(float(den.max(initial=0)), float(s[-1] - s[-2]))
        return v, conf

class Reservoir(FullHistory):
    """Critique §8: uniform random retention — the simple baseline rare-event retention must beat."""
    name = 'reservoir'
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.seen = 0
    def ingest(self, e):
        self.seen += 1
        cap = self.B // self.REC
        rec = (_key(e.c, e.o), e.value, e.t, e.source)
        if len(self.records) < cap: self.records.append(rec)
        else:
            j = int(self.rng.integers(self.seen))
            if j < cap: self.records[j] = rec

class ConfirmationProtected(Associative):
    """2. Associative core + protected episodic slots for rare experiences, promoted only after an
    independent confirmation (different source or a later time), then exempt from decay/eviction."""
    name = 'confirmation_protected'
    PREC = 10
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.candidates = {}   # key -> (value, t, source)   (1 slot each, costs PREC too)
        self.protected = {}    # key -> [value, confirmations]
    def bytes_used(self):
        return len(self.cells) * self.CELL + (len(self.candidates) + len(self.protected)) * self.PREC
    def ingest(self, e):
        k = _key(e.c, e.o)
        if e.c in RARE:
            if k in self.protected:
                p = self.protected[k]; p[0] += 0.3 * (e.value - p[0]); p[1] = min(p[1] + 1, 255)
            elif k in self.candidates:
                v0, _t0, s0 = self.candidates[k]
                if e.source != s0 and abs(e.value - v0) < 0.25:     # independent confirmation
                    self.protected[k] = [(v0 + e.value) / 2, 2]; del self.candidates[k]
                else:
                    self.candidates[k] = (e.value, e.t, e.source)   # replace the unconfirmed guess
            else:
                self.candidates[k] = (e.value, e.t, e.source)
        super().ingest(e)   # associative core also learns, and enforces the shared budget on cells
        while self.bytes_used() > self.B and self.candidates:
            self.candidates.pop(next(iter(self.candidates)))
        while self.bytes_used() > self.B and self.cells:
            del self.cells[min(self.cells, key=lambda kk: self.cells[kk][1])]
    def belief(self, c):
        v, conf = super().belief(c)
        for o in range(N_OPTIONS):
            p = self.protected.get(_key(c, o))
            self.retrieval_ops += 1
            if p: v[o] = p[0]; conf = max(conf, 0.8)
        return v, conf

class ProvenanceAware(Base):
    """3. Episodic records with source, time, confidence, contradiction flag; learned per-source
    reliability; contradicted records are kept (down-weighted), not purged; consistent same-source
    records compact into summaries. Ablations switch single ingredients off (CRITIQUE §4)."""
    name = 'provenance'
    REC, SUM, SRC = 11, 12, 4
    def __init__(self, budget, rng, decay=0.995, use_reliability=True, keep_contradicted=True, use_recency=True):
        super().__init__(budget, rng, decay)
        self.use_reliability, self.keep_contradicted, self.use_recency = use_reliability, keep_contradicted, use_recency
        self.records = []     # dict(k, v, t, s, flag)  flag: 1 = contradicted
        self.summaries = {}   # (k, s) -> [v, w, t]
        self.t_now = 0
        self.rel = np.full(N_SOURCES, 0.6); self.rel[0] = 0.9   # self is trusted more, a prior not a law
    def bytes_used(self):
        return len(self.records) * self.REC + len(self.summaries) * self.SUM + N_SOURCES * self.SRC
    def _belief_raw(self, c, count_ops=True):
        num = np.zeros(N_OPTIONS); den = np.zeros(N_OPTIONS)
        t_now = self.t_now
        for r in self.records:
            if count_ops: self.retrieval_ops += 1
            if r['k'] // N_OPTIONS != c: continue
            w = (self.rel[r['s']] if self.use_reliability else 1.0)
            w *= (self.decay ** (t_now - r['t'])) if self.use_recency else 1.0
            if r['flag']: w *= 0.25
            num[r['k'] % N_OPTIONS] += w * r['v']; den[r['k'] % N_OPTIONS] += w
        for (k, s), (v, w0, t) in self.summaries.items():
            if count_ops: self.retrieval_ops += 1
            if k // N_OPTIONS != c: continue
            w = w0 * (self.rel[s] if self.use_reliability else 1.0)
            w *= (self.decay ** (t_now - t)) if self.use_recency else 1.0
            num[k % N_OPTIONS] += w * v; den[k % N_OPTIONS] += w
        return np.where(den > 0, num / np.maximum(den, 1e-9), PRIOR), den
    def ingest(self, e):
        k = _key(e.c, e.o)
        self.t_now = max(self.t_now, e.t)
        v_hat, den = self._belief_raw(e.c, count_ops=False)
        established = den[k % N_OPTIONS] > 2.0
        err = abs(e.value - v_hat[k % N_OPTIONS])
        flag = 1 if (established and err > 0.35) else 0
        # reliability learns from agreement with what's established; self-experience teaches hardest
        if established:
            delta = (0.02 if e.source == 0 else 0.01) * (1 - 2 * min(err / 0.5, 1.0))
            self.rel[e.source] = float(np.clip(self.rel[e.source] + delta, 0.05, 0.99))
            # a self-experience is near ground truth: re-judge stored records on this cell against it
            if e.source == 0:
                for r in self.records:
                    if r['k'] == k:
                        agree = abs(r['v'] - e.value) < 0.25
                        self.rel[r['s']] = float(np.clip(self.rel[r['s']] + (0.015 if agree else -0.03), 0.05, 0.99))
                        if not agree and not r['flag']: r['flag'] = 1
                        elif agree and r['flag']: r['flag'] = 0   # a real change vindicates the early report
        if flag and not self.keep_contradicted:
            return self._enforce()
        self.records.append(dict(k=k, v=e.value, t=e.t, s=e.source, flag=flag))
        self._enforce()
    def _enforce(self):
        # compact first: merge the oldest unflagged record into its (key, source) summary
        while self.bytes_used() > self.B:
            idx = next((i for i, r in enumerate(self.records) if not r['flag']), None)
            if idx is None: break
            r = self.records.pop(idx)
            sk = (r['k'], r['s']); v, w, ts = self.summaries.get(sk, [PRIOR, 0.0, r['t']])
            w = w * (self.decay ** max(r['t'] - ts, 0))   # age the old weight up to the merged record's time
            w2 = w + 1.0
            self.summaries[sk] = [v + (r['v'] - v) / w2, w2, max(r['t'], ts)]
        # still over (flagged records + summaries): evict oldest flagged, then weakest summaries
        while self.bytes_used() > self.B and any(r['flag'] for r in self.records):
            self.records.pop(next(i for i, r in enumerate(self.records) if r['flag']))
        while self.bytes_used() > self.B and self.summaries:
            victim = min(self.summaries,
                         key=lambda s: self.summaries[s][1] * (self.decay ** (self.t_now - self.summaries[s][2])))
            del self.summaries[victim]
        while self.bytes_used() > self.B and self.records:
            self.records.pop(0)
    def belief(self, c):
        self.queries += 1
        v, den = self._belief_raw(c)
        s = np.sort(v); conf = self._conf_from_weight(float(den.max(initial=0)), float(s[-1] - s[-2]))
        return v, conf

def make(arch, budget, rng, decay):
    table = {
        'associative': Associative, 'full_history': FullHistory, 'reservoir': Reservoir,
        'confirmation_protected': ConfirmationProtected, 'provenance': ProvenanceAware,
    }
    if arch in table: return table[arch](budget, rng, decay)
    if arch == 'provenance_no_rel': return ProvenanceAware(budget, rng, decay, use_reliability=False)
    if arch == 'provenance_purge': return ProvenanceAware(budget, rng, decay, keep_contradicted=False)
    if arch == 'provenance_no_recency': return ProvenanceAware(budget, rng, decay, use_recency=False)
    raise KeyError(arch)
