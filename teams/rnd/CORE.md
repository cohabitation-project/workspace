# R&D / Kodama: core (read first, every session)

## Current governing baseline — 2026-11-02

Geoffrey's direct clarification in General Hall message m_mvytejli1009651b sets the Scout K-01 master height at **24 inches (about 610 mm)**. **Weight is an output, not a target**; the old 1.8 kg figure is superseded and must not constrain design.

The first useful unit must:
- be a standalone Scout with its own movement capability;
- use printable body parts sized to the human builder's printer;
- accept a hardware pack and software activation as a repeatable assembly;
- help rebuild or repair another Scout ("one builds two and so on");
- connect with other Scouts to perform a diverse range of tasks.

Phone versus Raspberry Pi compute was discussed but not decided. Keep the compute bay and power/data interface modular. The movement architecture is also open: compare buildable alternatives and derive requirements rather than treating old guessed targets as specifications.

**Unresolved manufacturing input:** printer make/model and usable bed dimensions. Do not freeze part segmentation until Geoffrey supplies them.

See `kodama/concept/WHAT-KODAMA-IS.md` for the dated amendment and historical provenance. The older 45 cm / 1.8 kg baseline is not current.

## Historical design warning

Kodama is not a quadruped dog robot. DRD v0.1-draft-2 is a historical quadruped draft and must not be used as the current body architecture. DRD v0.2 is the current humanoid-Scout rewrite, but remains a draft: its numerical targets are guesses or inferences, not approved or demonstrated requirements.

## Engineering discipline

Research alternatives with reasons; simulate before buying; label each value as measured, simulated, inferred, or guessed. Distinguish calculated mass (CAD volume × density plus vendor masses) from physically weighed mass. The mandate remains in `kodama/MANDATE.md`.
