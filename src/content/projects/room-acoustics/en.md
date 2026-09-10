---
title: 'Room Acoustics Simulator'
summary: 'A Go engine that answers two questions about a rectangular room — how long sound takes to decay, and which eigenmodes the geometry imposes — and proves its answers against a generated ledger of 78 tolerance-stated checks, all of them passing, including one that spent months red because the specification was wrong.'
---

## Overview

A room shapes every sound made inside it. Two properties govern how: the reverberation time, which is how long energy takes to fall by 60 dB, and the modal distribution, which is the set of standing waves the geometry forces at low frequencies. This engine computes both for a rectangular room and exposes them over a small HTTP API, with a browser front end over it: set the dimensions, assign materials to each surface, then pick a mode out of the table and watch its standing wave appear on a cut plane through the room. The cover of this entry is that tool, showing the 57.17 Hz axial mode selected.

The interesting part is not the physics, which is textbook. It is that every number the engine produces is checked against a stated tolerance — and that when one of those checks went red, it stayed red in the report until the specification behind it was fixed.

## Problem

Acoustic calculators are easy to write and hard to trust. Sabine's equation is four symbols long; the eigenmode equation is not much worse. Anyone can implement them. The difficulty is knowing whether a given implementation is right — and most tools answer that question by asserting it.

The design constraint here was therefore not "compute RT60" but "make the correctness of the computation externally checkable".

## Approach

The core is Go with no third-party dependencies, so the arithmetic has no library between it and the equations. Around it:

1. **Statistical decay** — RT60 per octave band by both Sabine and Eyring-Norris, over an embedded catalogue of 46 absorption coefficients whose sources are documented individually.
2. **Modal analysis** — enumeration and classification of every eigenmode below 300 Hz into axial, tangential and oblique, with the Schröder frequency that separates the modal regime from the statistical one, and flags for problematic modal overlap.
3. **A golden-check validator** — `make validate` walks every gating check the specification names, evaluates it against the live code at the tolerance the specification states, and writes the ledger to a report file.
4. **A Python cross-check worker** — a second implementation, in a second language, using NumPy and pyroomacoustics.

## Results

The generated report carries **78 gating checks, and all 78 pass.**

The geometry agrees to within 0.004%. Untreated RT60 at mid frequencies comes out at 2.78549 s against a specified 2.78 s, a deviation of 0.197%. Eyring-Norris stays at or below Sabine in every band of every scenario, as the physics requires. The modal census finds **92 modes — 13 axial, 42 tangential, 37 oblique** — and locates the Schröder frequency to within 0.07%.

The cross-checks are worth separating, because they are not equally strong. The **modal** census is verified against the Python worker's own NumPy implementation, written independently from the eigenvalue equation: a second implementation in a second language, agreeing on all 92 modes with a worst-case disagreement of 0 Hz — but not a third-party tool. The **statistical** half is a genuine third-party check: Sabine and Eyring agree with pyroomacoustics across all twelve band-method pairs to a residual of **0.000107%**, which is float noise rather than agreement.

## The check that was red, and how it was closed

For a long stretch this report showed 77 of 78, and the failure was the most
informative line in it.

The specification asked for a mid-frequency RT60 of 0.40 s ±8% from a stated
acoustic treatment. That treatment yielded **0.448 s — 12.007% high.** The
arithmetic said reaching 0.40 s would take 5.20 m² of mineral wool where the
specification called for 4.33 m².

So the defect was in the specification's expected value, not in the engine. The
tolerance was never widened and the check was never deleted; it stayed red, with
an architecture decision record carrying the working, until the specification
itself was corrected. It passes now because the number it compares against is
finally right — not because the bar was lowered to meet it.

That distinction is the whole point. A validation report that only ever shows
green is not evidence of correctness; it is evidence that nothing was allowed to
disagree. This one disagreed, in public, for as long as it took.

## Key contributions

- A machine-generated validation ledger with tolerances reproduced verbatim from the specification, rather than a claim of accuracy in prose
- Two oracles, with their strength stated honestly: a third-party library for the statistical model, an independent second implementation for the modal one
- A failure that was traced to the specification and closed by correcting it, rather than by widening the tolerance it broke
- Provenance for all 46 absorption coefficients, so a disputed result can be traced to its source
- Continuous integration that runs the validator on every push and publishes the report as an artifact

## Key learnings

Building the second implementation was worth more than any single test. Unit tests confirm the code does what its author thought; a second implementation, written from the equation rather than from the first implementation, catches what the author misunderstood. The two disagreed at first, and the disagreement was real.

The red check taught the more useful lesson. The reflex on a failing result is to adjust the tolerance until it passes, and that reflex destroys the only thing a validation suite is for. Chasing the discrepancy through the arithmetic instead turned a nuisance into a finding: the specification was asking for something its own treatment could not deliver. Correcting the specification is what closed it — which took longer than editing a tolerance would have, and is the only version of the fix that was worth anything.
