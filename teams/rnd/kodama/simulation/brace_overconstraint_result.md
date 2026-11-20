Simulated test: Overconstraint in straight-brace (Aster's question)
=================================================================

Test: 2-node linkage (shoulder, wrist), main link has one horizontal and one vertical (brace) constraint.
- Baseline: 2 constraints
- Overconstrained: 3 constraints (adds diagonal brace)

Matrix ranks:
- Baseline: 2 (expected: 2)
- Overconstrained: 2 (expected: 2 — extra row is dependent)

Findings:
- In planar geometry with two points and two orthogonal constraints, extra (redundant) straight-brace links do NOT increase the mathematical constraint rank. Such links are linearly dependent and cannot further increase system rigidity mathematically.
- In the real world, manufacturing imperfections make overbracing problematic: they introduce internal stresses (warping, preloads), but don't increase external stiffness.

Limits: Purely simulated, no flex, non-idealities or 3D effects. Real hardware may behave differently.
