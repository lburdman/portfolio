# Repository audits

Date: 2026-08-30. Eight public `lburdman` repos, cloned shallow and read; nothing
was installed, built or run.

**The bar.** A project earns a portfolio slot by proving a result — a
measurement, a benchmark, a validation report, or a reachable URL — plus an
EN/ES write-up and images that show what the work produced. Calibration: the
`acustics` repo ships a generated report of 78 tolerance-stated checks, 77
passing, one failure kept because the spec was wrong. Effort is not evidence.
None of the eight repos below currently clears that bar. "Evidence: none" is the
normal finding here.

No repo in this set has a LICENSE file.

---

## AgroVaxx

**What it does.** Embedded C++ firmware for livestock vaccination sessions on an
STM32 NUCLEO-F429ZI: reads an RFID tag (MFRC522), requires a physical button
confirmation, rejects a repeat scan of the same animal, and streams the session
log to a phone over Bluetooth UART.

**Stack / builds today.** Mbed OS 6 + CMake + arm-none-eabi. Core logic is
hardware-independent behind `core/Interfaces.h`, so the state machine compiles
and tests natively. Plausibly builds; the `third_party/mfrc522` submodule and the
Mbed toolchain are the risk.

**Activity.** Last commit 2026-02-20, 3 commits over 2 days. A single burst, not
sustained work — but a coherent one, with a driver removed and a
`TagDedupFilter` introduced in the last commit.

**Tests / CI.** `.github/workflows/ci.yml` runs two jobs: native unit tests
(`test_state_machine`, 175 lines, ~9 assertions, hand-rolled harness printing
"All tests passed!") and a full Mbed firmware compile. Plus three standalone
hardware test binaries (RFID, BLE, LED/button) for bench bring-up.

**Evidence.** None. No read-success rate, no dedup timing measurement, no serial
capture, no photo of the rig. The dedup window is a 3000 ms default in
`core/TagDedupFilter.h` — a stated constant, not a measured one.

**Images.** None.

**Domain.** electronics.

**Sensitivity.** Clean. No credentials, no client material. No LICENSE.

**VERDICT: ENHANCE** — real hardware, real decoupling, real CI; missing piece is
a bench run committed as data: N tag reads with success/failure counts, the
duplicate-rejection rate at the 3 s window, and photos of the rig plus a serial
log.

## NeuralNetworks

**What it does.** Three notebooks (perceptron, Hopfield, Kohonen) from the UBA
course _Redes Neuronales 86.54_, written up as documentation rather than as a
submission: pattern recall under noise, spurious states, network capacity, and an
Ising-model detour.

**Stack.** Jupyter/Python. Notebooks carry executed outputs (28, 31 and 52 output
cells).

**Activity.** Last commit 2024-10-14, 20 commits over two days — a documentation
pass over pre-existing code.

**Tests / CI.** None.

**Evidence.** Weak but not absent. The experiments are described with stated
conditions — "random pixel values were inverted by 30%", "set to white, also by
30%", "dark elements added by 40%" — and the outcome is qualitative: "correctly
recover the patterns in most cases". Capacity and error-vs-synapse-removal are
shown as plots only. No number is quoted anywhere.

**Images.** 15 committed plots, all portfolio-usable, at
`/Users/marioburdman/.claude/jobs/56b1d200/tmp/NeuralNetworks/images/` —
notably `hopfield_capacity.png`, `hopfield_error.png`, `spurious_states.png`,
`capacity_perceptron.png`, `error_XOR_3D.png`.

**Domain.** ai.

**Sensitivity.** Clean. Already bilingual: `docs/hopfield.md` + `hopfield-en.md`,
`docs/perceptron.md` + `perceptron-en.md`. No LICENSE.

**VERDICT: ENHANCE** — it is the only repo here that already has plots and an
EN/ES write-up; missing piece is numbers: a committed table of recall accuracy
vs. noise level and vs. stored-pattern count, with measured capacity compared to
the theoretical α ≈ 0.138.

## hermes-organization

**What it does.** A Python CLI (`hermes-org`) that is the external configuration
and workflow layer for a private "Hermes Agent": YAML registries of providers,
models, budgets and projects; a deterministic model router; a cost ledger; and a
spec-factory that generates spec/plan/tasks artifacts.

**Stack.** Python, `pyproject.toml`, 775 LOC across five modules.

**Activity.** Last commit 2026-06-15, 6 commits over three days.

**Tests / CI.** 29 test functions across 7 files (routing, config, artifacts,
CLI, one integration test). No CI workflow.

**Evidence.** None that measures anything. `docs/phase-4c-acceptance-output.txt`
is the closest thing, and it asserts only that four commands "succeeded and
returned valid JSON" and that `provider_called is false`,
`actual_cost_usd is null`. The router has never priced a real call.

**Images.** None.

**Domain.** ai, loosely — it is agent tooling, not an intelligent system.

**Sensitivity.** `config/projects.yaml` leaks a local path
(`/Users/lburdman/Projects/hermes-organization`) and names an unpublished thesis,
"Hybrid Classical-Quantum Neural Networks Paper". The agent it organizes is not
public, so a reader cannot see the thing being organized. No LICENSE.

**VERDICT: ENHANCE** — the discipline is genuine but nothing is proven; missing
piece is a real run: route a fixed set of N tasks, commit the resulting cost
ledger, and state the measured spend against a single-model baseline.

## blackhole-simulator

**What it does.** A browser Schwarzschild black-hole renderer: a GLSL fragment
shader ray-marches light paths past the hole, with a volumetric accretion disk,
Doppler beaming, an emergent photon ring, and lil-gui controls.

**Stack.** Vite + TypeScript + raw WebGL2. 1154 LOC, of which 307 is the shader.
Should build.

**Activity.** Last commit 2026-01-18, **1 commit** — a single dump. 421 tracked
files, 405 of them `node_modules`, which is committed. `.DS_Store` too.

**Tests / CI.** None.

**Evidence.** None, and the README is careful to say the bending is
"approximated using the Newtonian deflection term scaled to match General
Relativity" — an approximation, not a validated geodesic integrator. No FPS
figure, no screenshot, no deployed URL.

**Images.** None committed.

**Domain.** None of the five. This is the structural problem: it fits no domain
the portfolio claims.

**Sensitivity.** Clean. No LICENSE.

**VERDICT: ENHANCE** — the one checkable number is right there; missing piece is
deploy the URL and commit a validation note measuring the rendered shadow radius
against the analytic √27 GM/c², plus screenshots. Only worth doing if a domain
is found for it.

## foodplanner

**What it does.** A Next.js meal planner: inventory of what you have, a scoring
planner that favours expiring ingredients (`SCORE_EXPIRING_SOON: 50`,
`PENALTY_REPEAT: -20`), a daily log, and a Gemini-backed profile chatbot.

**Stack.** Next 16, React 19, Prisma 5, NextAuth, Tailwind, Gemini.

**Activity.** Last commit 2026-02-19, **1 commit** ("Initial commit").

**Tests / CI.** None of either.

**Evidence.** None. The README is the unedited `create-next-app` template. No
deployment, no screenshots.

**Images.** None (only Next.js template SVGs).

**Domain.** None. A CRUD app with an LLM call is not an intelligent system.

**Sensitivity.** The Gemini key is read from the environment — no secret
committed. But the generated Prisma client is committed (68 tracked files under
`prisma/client` and `generated/`), including a macOS binary
`libquery_engine-darwin.dylib.node`. No LICENSE.

**VERDICT: ARCHIVE** — honest app work, but there is no result here to measure
and no domain that wants it.

## RedesNeuronales

**What it does.** The raw submissions for _Redes Neuronales 86.54_ — TP1, TP2,
TP3 — as notebooks plus Spanish PDF reports. It is the source material that
`NeuralNetworks` was later written up from.

**Stack.** Jupyter. 17 commits, 2024-05 to 2024-07 — genuinely sustained across
the term.

**Tests / CI.** None.

**Evidence.** The PDFs contain the analysis, but they are course reports in
Spanish, not a result the repo itself states. Nothing machine-readable.

**Images.** 79 PNGs, including a Kohonen training sequence at 0/100/250/500/750/
1000 iterations for circle, ring, triangle and travelling-salesman cases, under
`/Users/marioburdman/.claude/jobs/56b1d200/tmp/RedesNeuronales/TP3/Images/`.
These are better raw media than `NeuralNetworks` has.

**Domain.** ai.

**Sensitivity.** Contains `TP2/enunciado.pdf` — a university handout, third-party
material — and a submitted zip with a student number in the filename. No README.
No LICENSE.

**VERDICT: SKIP** — undifferentiated coursework, superseded by `NeuralNetworks`;
harvest the TP3 Kohonen plots into that repo and leave this one alone.

## Calendario

**What it does.** A Java/Maven Google-Calendar clone (events, tasks, recurrence
rules, alarms) for _Algoritmos y Programación 3 (95.02)_, 2023.

**Stack.** Java + Maven + JUnit.

**Activity.** Last commit 2023-06-10, 49 commits. Two authors, and the majority
of commits are by a classmate, Cecilia Jurgens.

**Tests / CI.** 39 `@Test` methods across 6 test classes. No CI. Early history is
littered with committed `.class` files later deleted; `.idea/` is committed.

**Evidence.** None. The README's own checklist shows stages 2 (persistence) and 3
(GUI) unchecked — the project is one third finished by its own definition.

**Images.** One UML diagram, `documents/CalendarUML.png`.

**Domain.** None.

**Sensitivity.** Names and student numbers of the author and a classmate. Not
Lucas's work alone. No LICENSE.

**VERDICT: SKIP** — shared coursework, admittedly incomplete, no result and no
domain.

## BatallaCampal

**Clone result.** Succeeded, but the repository is empty — `git clone` warns
"You appear to have cloned an empty repository." No commits, no files.

**VERDICT: SKIP** — nothing exists to evaluate.

---

## Ranked

| #   | Repo                | Verdict | The single missing piece                                                                                   |
| --- | ------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | AgroVaxx            | ENHANCE | A bench run committed as data: read-success and duplicate-rejection counts, serial log, photos of the rig. |
| 2   | NeuralNetworks      | ENHANCE | Numbers: recall accuracy vs. noise and vs. pattern count, measured capacity vs. theoretical α ≈ 0.138.     |
| 3   | hermes-organization | ENHANCE | One real routing run with the cost ledger committed and spend stated against a single-model baseline.      |
| 4   | blackhole-simulator | ENHANCE | Deploy the URL and validate the shadow radius against √27 GM/c²; also needs a domain it belongs to.        |
| 5   | foodplanner         | ARCHIVE | — nothing here will ever prove a result.                                                                   |
| 6   | RedesNeuronales     | SKIP    | — superseded by NeuralNetworks; salvage the TP3 Kohonen plots only.                                        |
| 7   | Calendario          | SKIP    | — shared coursework, self-declared one-third finished.                                                     |
| 8   | BatallaCampal       | SKIP    | — empty repository.                                                                                        |
