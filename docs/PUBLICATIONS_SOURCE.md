# Publications — raw source material

Working notes on the LinkedIn posts and photographs in the (gitignored)
`publications/` and `images/` folders. **This file is the record of what was
used, what was not, and why.** The folders themselves are not build input.

Anything transcribed from an image is marked as such: the wording is the
author's and should be checked before it goes near the site.

This material now has an outlet it did not have when these notes were started:
the `writing` collection, a chronology of dated field reports at `/writing/`,
which publishes long-form text and photographs together. **All seven posts** and
eight of the ten images have gone into it. The two photographs still held back
are held back for reasons of their own, below — not for want of a place to put
them.

---

## Used

### The writing collection

Five articles under `src/content/writing/`, each an `article.json` with `en.md`
and `es.md` beside it. The contract they answer to is
`docs/PROJECT_CONTENT_CONTRACT.md` §15–§24.

| Article                          | Date       | Kind      | From                                              |
| -------------------------------- | ---------- | --------- | ------------------------------------------------- |
| `mitx-micromasters-statistics`   | 2026-08    | study     | `Data Analysis - MITx.txt`, `statistics mitx.txt` |
| `qiskit-fall-fest-fiuba-2025`    | 2025-10-31 | community | `kick off-qff.txt`, `Cierre-QFF.txt`              |
| `noche-de-los-museos-fiuba`      | 2025-11-08 | community | `Noche de los museos.txt`                         |
| `lanet-2025-complex-networks`    | 2025-08    | research  | `LANET.txt`                                       |
| `quantum-computing-course-fiuba` | 2024-07    | teaching  | `cierre cuatri.txt`                               |

The two Fall Fest posts are one article, not two: kickoff and closing are the
opening and closing of a single month, and splitting them would have produced
two half-reports that each had to re-explain the festival. The two MITx posts
are one article for the same reason — a course and the programme it completes.

`mitx-micromasters-statistics` is the only article with no `media/` directory
and no `cover`. Both are optional in the schema, and there is no photograph of
finishing a course online; inventing a stock image for the slot would be adding
a picture of nothing.

`lanet-2025-complex-networks` declares `relatedProjects: ["quantum-audio"]`; it
is the only article that does, because it is the only one describing work the
site also carries as a project.

### The photographs

Eight of the ten files in `images/` are published. All were converted to WebP
with `cwebp` on the command line — there is no conversion tooling in this
repository and §22 says there never will be, so the conversion happens before
the commit or not at all.

| Source                             | Published as                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `hackathon_qff.jpeg`               | `qiskit-fall-fest-fiuba-2025/media/hackathon-group-library.webp` (cover)           |
| `kickoff qff.jpeg`                 | `qiskit-fall-fest-fiuba-2025/media/kickoff-lecture-hall-audience.webp`             |
| `qff speaking.jpeg`                | `qiskit-fall-fest-fiuba-2025/media/opening-talk-quantum-utility.webp`              |
| `2025-qiskit-fall-fest-mentor.png` | `qiskit-fall-fest-fiuba-2025/media/ibm-quantum-mentor-badge.webp`                  |
| `SpinQ.jpeg`                       | `noche-de-los-museos-fiuba/media/spinq-desktop-quantum-computer.webp` (cover)      |
| `LANET.jpeg`                       | `lanet-2025-complex-networks/media/lanet-conference-group-photo.webp` (cover)      |
| `poster LANET.jpeg`                | `lanet-2025-complex-networks/media/poster-transfer-learning-quantum.webp`          |
| `cierre cuetri.jpeg`               | `quantum-computing-course-fiuba/media/course-closing-group-classroom.webp` (cover) |

`poster LANET.jpeg` is used twice, at two crops, and the difference is the
point. `src/assets/lanet-2025-poster.webp` is cropped to the poster itself and
away from the people around it, so the About block reads as a document. The
article's copy keeps the full frame, two authors either side of the stand,
because in a dated field report the people are the report.

Alt text for all eight lives in `writing.mediaAlt` in `src/i18n/en.ts` and
`src/i18n/es.ts`, keyed `<slug>/<file stem>`. It is not optional and not
silently skippable: `tests/i18n.test.ts` sweeps the real `media/` directories,
so committing a photograph fails the build until both locales describe it, and
deleting one fails the build until both entries go.

### LANET 2025 — the research poster

**On the site twice**: the `Research presented` block on About, above teaching,
and the LANET article.

- Title: _Transfer Learning para Redes Neuronales Híbridas Clásico–Cuánticas_
- Authors: Lucas Burdman, Leónidas Facundo Caram
- Affiliation: Universidad de Buenos Aires, Facultad de Ingeniería, Laboratorio
  de Redes y Sistemas Móviles (LRSyM)
- Venue: LANET 2025, Latin American Conference on Complex Networks, Punta del
  Este, Uruguay
- Method visible on the poster: CREMA-D, mel-spectrograms, ResNet18 pretrained
  on ImageNet as a 512-feature extractor, a dressed quantum circuit reducing to
  n_q qubits, a variational circuit of parameterised rotations and CNOTs

This is still the most valuable item in the whole folder: it is the only work on
the site reviewed by people under no obligation to be kind about it. The title
is not translated — a translated title is one nobody can search for.

### MITx — the certificates, and what they do and do not say

Both MITx posts are now the `mitx-micromasters-statistics` article. The
verification notes below are the least reproducible thing in this file and stay
here whatever happens to the article.

- **6.419x Data Analysis** — certificate issued **7 January 2026**. The **97%
  appears only in the post**: the certificate records a passing grade and no
  score.
- **Fundamentals of Statistics** — **98%**, also only in the post, on the same
  footing.
- **Programme certificate** — Statistics and Data Science (General Track),
  issued **May 2026**, credential `95a95ec9be394396a5e9b082f1d00fcc`,
  verifiable at
  `https://credentials.edx.org/credentials/95a95ec9be394396a5e9b082f1d00fcc/` —
  re-checked live, HTTP 200.
- **The author dates completion to August 2026**, and the article is dated
  `2026-08` on his word.

Three dates, side by side: certificates issued January and May 2026, completion
reported August 2026. Recorded as a discrepancy rather than an error — the
credential is public and anyone revisiting this can check it in a browser.

The article states both scores as the author's own report of his results and
never as certified, which is the direct consequence of this file having noticed
that the certificate carries no score. A verification note that changes how a
sentence is worded a year later has paid for the minute it cost.

The MicroMasters programme also sits in the credentials trio. Making that
credential a link is still an open proposal: `CredentialTrio` is
`readonly [string, string, string]` rendered as bare list items in both
`Hero.astro` and `about.astro`, so an `href` means changing the type, both
components, both dictionaries and the i18n tests — and the Hero's credential
line is a tight typographic element where link affordances change how the hero
reads.

### Qiskit Fall Fest FIUBA — the About role

The role description carries the closing hackathon where teams built a Grover
search in Qiskit from scratch, and the Noche de los Museos invitation the
festival's reach earned, where the only 2-qubit NMR quantum computer in
Argentina was exhibited.

Both figures from the posts are now in the article, and they are kept apart
there rather than made to compete: **436 registrations** at the 31 October
kickoff, **more than 500 participants** by the end of November. An early pass
replaced the existing "500+ attendees" on About with 436 and a test caught the
swap. 436 was the count at kickoff in a post saying it kept growing, so it never
contradicted 500+ — trading a true figure for a narrower one is not a
correction. Publish both, dated, or publish the larger one.

Sponsors named across the posts, all now in the article: QuantumRev, Tecmaco
Integral S.A., INVAP, Packt. IBM Quantum backs the festival.

---

## Held back, with reasons

### The individual MITx course scores, as About-page credentials

The 98% and the 97% are in the article and nowhere else. Listing a component
course beneath the completed programme in the credentials trio reads as padding,
and the scores are self-reported (above) — a credentials list is the one place
on the site where every line is expected to be independently verifiable.

### `team_hackathon montevideo.png`

No source text exists for it, and **the event it shows has not been
identified**. Every other photograph on the site sits under a dated article that
says what the room was; this one has neither a date nor a name, and a
photograph published under a caption its author had to guess at is the failure
mode the rest of this document exists to prevent.

It is worth chasing rather than dropping — see below.

### `detalle proyecto superpuesto linea en no hover.png`

A screenshot of this site's own project list in a hover state. It is working
material from a design pass, not content, and it belongs in neither the writing
collection nor a project case study.

---

## The one thing worth chasing

**The poster's results table cannot be read from the photograph.**

It is the missing result for the strongest project on the site.
`quantum-audio`'s case study states no accuracy at all — it describes the
pipeline and the design decisions and stops — the `qnn-transfer-learning`
README states none either, and the LANET article now says outright that it is
not going to quote a number. That is three places declining to give a figure
because the figure is not available, which is honest and unsatisfying in equal
measure.

The poster has the numbers: a table comparing classical against quantum heads
over two-class and three-class tasks, with an `Exactitud (%)` row. At the
photograph's resolution those percentages are illegible, and guessing them onto
a site whose whole argument is evidence over assertion would be the one
unforgivable move.

Needed: the numbers from the source, or a PDF of the poster.

---

## The note that paid for itself

An earlier version of this file flagged that the teaching post described closing
a **first** semester while About claimed the role **since 2023**, and said the
two needed reconciling before either was written down. They were not reconciled,
and both shipped.

They were wrong, and the CV settles it. About now reads:

- Qiskit Fall Fest FIUBA — **Lead Organizer**, `2025` (a single month, not
  "2023 – Present"; the description had also said Co-organizer)
- Digital Systems — FIUBA — `2025 – Present` (was 2022)
- Quantum Computation and Communications — FIUBA — `2024 – Present` (was 2023)

The teaching article agrees with the last of these: it says the role has been
held since 2024, and the cuatrimestre it describes is dated 2024-07.

This is recorded because the correction is less interesting than the note that
caught it. Writing down "these two facts disagree" costs a line and catches the
class of error no test can, because both values type-check and both render.

---

## Still to collect

- **The event behind `team_hackathon montevideo.png`.** What it was, when, who
  was there, and whether there is a post about it. With that, it is an article.
  Without it, it stays where it is.
- **The poster's results table**, above — the only outstanding fact that blocks
  something already written.
- **Four earlier screenshots that never arrived** — they were sent as
  `NSIRD_screencaptureui_*` temp paths, which macOS deletes the moment the
  screenshot thumbnail is dismissed. To supply one: take it, wait for the
  thumbnail to vanish, then drag the file from `~/Desktop`.

## Loose end still open

`about.portraitAlt` exists in `src/i18n/types.ts` and in both dictionaries and
is **used nowhere**. A dead key that looks authoritative is exactly the pattern
the audit named: the next person needing portrait alt text wires up this one,
and the two locales are then free to drift apart unnoticed. Either render a
portrait or delete the key.

Note that this is precisely the failure `writing.mediaAlt` is protected from and
`about.portraitAlt` is not — the media sweep in `tests/i18n.test.ts` ties keys to
files on disk, while a standalone string key answers to nothing.
