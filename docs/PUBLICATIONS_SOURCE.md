# Publications — raw source material

Collection point for LinkedIn posts and other writing, pending a decision on
where any of it belongs. **Nothing here is published yet.**

The open design question, unchanged from when it was first raised: are these a
new section on the site, or evidence attached to existing projects? A new
section is an application change — it touches `SECTION_IDS`, the navigation,
both dictionaries and the spine's band count. Attaching them to projects is
content-only. Decide before building.

Transcribed from screenshots supplied by the user. Anything transcribed from an
image is marked as such, because the wording is theirs and should be checked
before it goes anywhere near the site.

---

## 1. MITx MicroMasters — Statistics and Data Science (complete)

_Source: screenshot of a LinkedIn post, transcribed 2026-08-30. Post date unknown._

Finished **6.419x: Data Analysis — Statistical Modeling and Computation in
Applications** with an overall score of **97%**, completing **all four courses**
of the Statistics and Data Science track of the MITx MicroMasters Programs.

The course covered the interplay between statistics and computation on real
datasets — core foundations, then applied across four domains:

- **Genomics and high-dimensional data** — dimension reduction and visualisation
  with PCA, MDS and t-SNE; modelling and interpretation in high dimensions.
- **Criminal networks and network analysis** — graph-based analysis and
  centrality measures to identify important nodes.
- **Prices, economics and time series** — forecasting with stationary models
  (moving average, autoregressive and related); model checking and
  interpretation on financial-style data.
- **Environmental data and spatial statistics** — Gaussian processes for spatial
  modelling; prediction with uncertainty quantification.

Stated takeaway: strong data analysis is not running models, it is asking the
right questions, choosing methods deliberately, and turning results into clear
and actionable reporting.

### Status: already on the site — and that is the point

**This credential is NOT missing.** `src/i18n/{en,es}.ts` already carries
`'MITx MicroMasters · Statistics & Data Science'` in the `CREDENTIALS` trio,
which the Hero and the About page both render. My first read of the screenshot
said "add this to About"; that was wrong, and checking before writing caught it.

What is missing is everything that would make it **checkable**, which is the
whole argument the rest of the site makes:

| Fact          | Value                                                                       | Source                                                                               |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Program       | Statistics and Data Science (General Track)                                 | MicroMasters certificate                                                             |
| Issued        | May 2026                                                                    | MicroMasters certificate                                                             |
| Credential ID | `95a95ec9be394396a5e9b082f1d00fcc`                                          | MicroMasters certificate                                                             |
| Verify URL    | `https://credentials.edx.org/credentials/95a95ec9be394396a5e9b082f1d00fcc/` | **checked live, HTTP 200**                                                           |
| Final course  | 6.419x Data Analysis: Statistical Modeling and Computation in Applications  | Verified certificate                                                                 |
| 6.419x issued | 7 January 2026                                                              | Verified certificate                                                                 |
| 6.419x score  | 97%                                                                         | LinkedIn post (NOT on the certificate — the certificate states a passing grade only) |

Source PDFs, both in `~/Downloads`, neither in any repo:
`MicroMasters | edX Credentials.pdf`, `MITx 6.419x Certificate | edX.pdf`.

### The proposal, not yet executed

Make the credential a link to that verify URL. Right now the trio is an
assertion; one `href` turns it into something a reader can check in a click —
on a site whose entire case is evidence over assertion, that is a
disproportionately large gain for a small change.

It is **not** done here because it is not free. `CredentialTrio` is
`readonly [string, string, string]`, rendered as bare list items in **two**
places (`Hero.astro`, `about.astro`). Making an entry linkable means changing
that type to carry an optional `href`, touching both components, both
dictionaries and the i18n tests — and the Hero's credential line is a tight
typographic element where introducing link affordances changes how the hero
reads. That is a design decision, so it waits for a yes.

The 97% is worth stating somewhere too, but note it appears only in the post:
the certificate itself records a passing grade, not a score.

---

## Still to collect

The user mentioned several posts with images and text. Four more screenshots
were sent and lost before they could be read (macOS deletes the
`NSIRD_screencaptureui_*` temp directory as soon as the screenshot thumbnail is
dismissed). To supply them: take the screenshot, wait for the floating thumbnail
to disappear, then drag the file from `~/Desktop`.
