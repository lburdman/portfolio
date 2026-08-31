# Publications — raw source material

Working notes on the LinkedIn posts and photographs in the (gitignored)
`publications/` and `images/` folders. **This file is the record of what was
used, what was not, and why.** The folders themselves are not build input.

Anything transcribed from an image is marked as such: the wording is the
author's and should be checked before it goes near the site.

---

## Used

### LANET 2025 — the research poster

**On the site**, as a new `Research presented` block on About, above teaching,
with the poster photograph.

- Title: _Transfer Learning para Redes Neuronales Híbridas Clásico–Cuánticas_
- Authors: Lucas Burdman, Leónidas Facundo Caram
- Affiliation: Universidad de Buenos Aires, Facultad de Ingeniería, Laboratorio
  de Redes y Sistemas Móviles (LRSyM)
- Venue: LANET 2025, Latin American Conference on Complex Networks, Punta del
  Este, Uruguay
- Method visible on the poster: CREMA-D, mel-spectrograms, ResNet18 pretrained
  on ImageNet as a 512-feature extractor, a dressed quantum circuit reducing to
  n_q qubits, a variational circuit of parameterised rotations and CNOTs

This is the most valuable item in the whole folder, and it is why the block
exists: it is the only work on the site reviewed by people under no obligation
to be kind about it. The title is not translated — a translated title is one
nobody can search for.

### Qiskit Fall Fest FIUBA — into the existing About role

The role description now carries what the posts document: the closing hackathon
where teams built a Grover search in Qiskit from scratch, and the Noche de los
Museos invitation the festival's reach earned, where the only 2-qubit NMR
quantum computer in Argentina was exhibited.

The kickoff post records **436 registrations**, still climbing at the time of
writing. That figure is deliberately **not** in the copy: a first pass replaced
the existing "500+ attendees" with it and a test caught the swap. 436 was the
count at kickoff in a post saying it kept growing, so it never contradicted
500+ — trading a true figure for a narrower one is not a correction.

Sponsors named across the posts, unused so far: QuantumRev, Tecmaco Integral
S.A., INVAP, Packt. IBM Quantum backs the festival.

---

## Held back, with reasons

### MITx — Fundamentals of Statistics, 98%

Not on the site. The MicroMasters **program** is already in the credentials
trio, and listing a component course beneath a completed program reads as
padding. Worth having only if the individual scores go somewhere — see the
verification note below.

### MITx — 6.419x Data Analysis, 97%

Same. Verified certificate issued 7 January 2026; the 97% appears **only in the
post**, since the certificate records a passing grade and no score. Do not
present it as certified.

Program certificate: Statistics and Data Science (General Track), issued May
2026, credential `95a95ec9be394396a5e9b082f1d00fcc`, verifiable at
`https://credentials.edx.org/credentials/95a95ec9be394396a5e9b082f1d00fcc/` —
checked live, HTTP 200. Making the credential a link is still an open proposal:
`CredentialTrio` is `readonly [string, string, string]` rendered as bare list
items in both `Hero.astro` and `about.astro`, so an `href` means changing the
type, both components, both dictionaries and the i18n tests — and the Hero's
credential line is a tight typographic element where link affordances change how
the hero reads.

### First semester teaching the quantum course

The post records closing a first semester as a teacher, with the first quantum
computer ever brought into the faculty — Victor Macarrein's 2-qubit NMR
machine — used to run real circuits. About already claims the teaching role
from 2023; "first semester" and "since 2023" need reconciling before either is
written down.

### The photographs

Nine event photographs. **One is used**: the LANET poster, cropped to the poster
itself and away from the people around it, so it reads as a document rather than
a social moment — the register the rest of the site's figures are in.

The others (hackathon, kickoff, speaking, SpinQ, semester close, Montevideo
team, mentor badge) are good photographs and belong on LinkedIn. This site has
no photography anywhere else; introducing a gallery of event snapshots would
change what kind of site it is, and that is a decision to take deliberately
rather than by accumulation.

---

## The one thing worth chasing

**The poster's results table cannot be read from the photograph.**

It is the missing result for the strongest project on the site.
`quantum-audio`'s case study states no accuracy at all — it describes the
pipeline and the design decisions and stops — and the `qnn-transfer-learning`
README states none either. The poster has the numbers: a table comparing
classical against quantum heads over two-class and three-class tasks, with an
`Exactitud (%)` row.

At the photograph's resolution those percentages are illegible, and guessing
them onto a site whose whole argument is evidence over assertion would be the
one unforgivable move. Needed: the numbers from the source, or a PDF of the
poster.

## Still to collect

Four earlier screenshots never arrived — they were sent as
`NSIRD_screencaptureui_*` temp paths, which macOS deletes the moment the
screenshot thumbnail is dismissed. To supply one: take it, wait for the
thumbnail to vanish, then drag the file from `~/Desktop`.

## Loose end found along the way

`about.portraitAlt` exists in `src/i18n/types.ts` and in both dictionaries and
is **used nowhere**. A dead key that looks authoritative is exactly the pattern
the audit named: the next person needing portrait alt text wires up this one,
and the two locales are then free to drift apart unnoticed. Either render a
portrait or delete the key.
