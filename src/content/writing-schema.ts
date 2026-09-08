/**
 * The writing content schema — the single source of truth for article metadata.
 *
 * Same constraints as `./schema.ts`, for the same reasons: `zod` arrives through
 * `astro/zod` and `astro:content` is never imported, so this module stays usable
 * from Vitest and from plain Node. Tests import *this* object; no test may
 * mirror a copy of it.
 *
 * ## Why a second schema rather than a wider first one
 *
 * A project and an article are not the same kind of thing. A project has a
 * repository, a stack and evidence; an article has a date, a body and a
 * photograph. `docs/PROJECT_CONTENT_CONTRACT.md` §12 says that when a piece of
 * content seems to need the schema widened, it is not a project — say so rather
 * than bending the model to fit one case. This file is that answer.
 *
 * What the two schemas *do* share, they share by import rather than by copy:
 * `SLUG_PATTERN`, `slugSchema`, `externalUrlSchema`, `domainIdSchema` and
 * `MEDIA_PATTERN` all come from `./schema.ts`. Those are content primitives,
 * not project fields, and a second copy of any of them would be a second chance
 * to weaken one.
 */
import { z } from 'astro/zod';
import { MEDIA_PATTERN, domainIdSchema, externalUrlSchema, slugSchema } from './schema.ts';

/**
 * Publication states for an article.
 *
 * Deliberately two, where a project has three. A project can be honestly
 * `wip` — shipped, incomplete, and labelled as such. An article is either
 * finished and readable or it is not; a half-written article shown with a
 * "work in progress" badge is just an unfinished article. `isVisible()` in
 * `src/lib/writing/visibility.ts` is the only consumer of this distinction.
 */
export const WRITING_STATUSES = ['published', 'draft'] as const;
export type WritingStatus = (typeof WRITING_STATUSES)[number];

/**
 * What kind of work an article reports on.
 *
 * This is the section's taxonomy and it is closed on purpose: four kinds that
 * describe how the work was done, not what it was about. What it was *about*
 * is `domains`, which is the site-wide vocabulary shared with projects.
 *
 *   - `teaching`   — a course, a class, a student cohort
 *   - `community`  — organising, outreach, an event open to people outside
 *   - `research`   — a paper, a poster, a conference
 *   - `study`      — the author on the other side of the desk
 */
export const WRITING_KINDS = ['teaching', 'community', 'research', 'study'] as const;
export type WritingKind = (typeof WRITING_KINDS)[number];

/**
 * When the thing happened: `YYYY-MM-DD`, or `YYYY-MM` when only the month is
 * known.
 *
 * Month precision is a real state, not a shortcut. Some of this material has a
 * date printed on a slide; some of it is "the end of that semester", and the
 * honest record of the second kind is the month. The alternative — picking a
 * plausible day — writes a fact into the site that nobody can vouch for, which
 * is the exact failure `AUDIT.md` exists to prevent. So the schema accepts both
 * and the renderer says only as much as it knows.
 *
 * A regex alone would accept `2025-13-45`. The refinement round-trips the value
 * through `Date` and compares the ISO output, which rejects impossible months
 * and impossible days alike (29 February in a non-leap year included).
 *
 * Stored as a string, never a `Date`: content collection metadata is serialised
 * to JSON, and a `Date` that survives the round-trip in dev but not in a build
 * is the class of bug this repo's audit is made of.
 */
export const contentDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}(?:-\d{2})?$/, 'Date must be written YYYY-MM-DD or YYYY-MM')
  .refine(
    (value) => {
      const full = value.length === 7 ? `${value}-01` : value;
      const parsed = new Date(`${full}T00:00:00Z`);

      // `toISOString()` THROWS `RangeError: Invalid time value` on an invalid
      // Date, and a throw inside a refinement escapes `safeParse` instead of
      // being reported as a validation failure — the build would die with
      // "Invalid time value" and no filename rather than with the message
      // below. `2025-13-01` and `08-11-2025` both reach here as invalid Dates.
      if (Number.isNaN(parsed.getTime())) return false;

      // A rolled-over date (`2025-02-30` becomes 2 March) no longer matches the
      // text it came from, which is what catches impossible days.
      return parsed.toISOString().startsWith(full);
    },
    { message: 'Date must be a real calendar date' },
  );

/**
 * External destinations for an article. `.strict()`, so a misspelled key fails
 * the build rather than silently vanishing from the rendered page.
 */
export const writingLinksSchema = z
  .object({
    /** The event's own page, registration or programme. */
    event: externalUrlSchema.optional(),
    /** Slides, a poster PDF, or other material presented. */
    slides: externalUrlSchema.optional(),
    /** A paper or published abstract. */
    paper: externalUrlSchema.optional(),
    /** Code written for, or shown at, whatever the article describes. */
    code: externalUrlSchema.optional(),
  })
  .strict();

/**
 * Locale-independent article metadata — one `article.json` per directory.
 *
 * Nothing user-facing lives here. Titles and summaries are per-locale and live
 * in the markdown frontmatter; alt text is per-locale and lives in the
 * dictionaries. The split is the same one the projects collection makes, and it
 * exists so a field cannot drift between the English and Spanish versions of
 * the same article.
 */
export const writingMetaSchema = z
  .object({
    /** Must equal the directory name. Enforced when the sources are read. */
    slug: slugSchema,

    /**
     * Defaults to `draft` so a scaffolded article cannot leak by omission.
     * Publishing is a deliberate edit.
     */
    status: z.enum(WRITING_STATUSES).default('draft'),

    /**
     * When the thing described actually happened. Sorts the index, and is the
     * one field that cannot be omitted: this section is a chronology, and an
     * article with no position in time has nowhere to stand on it.
     */
    date: contentDateSchema,

    /** How the work was done. */
    kind: z.enum(WRITING_KINDS),

    /**
     * What the work was about, in the site-wide domain vocabulary shared with
     * projects. At least one, so every article can be placed against the same
     * colour and language the rest of the site already uses.
     */
    domains: z.array(domainIdSchema).min(1, 'At least one domain is required'),

    /** Lead image, relative to the article's own `media/` directory. */
    cover: z
      .string()
      .regex(MEDIA_PATTERN, 'Cover must be a relative path inside the article media/ directory')
      .optional(),

    links: writingLinksSchema.optional(),

    /**
     * Slugs of projects this article bears on, so a reader who finishes the
     * LANET write-up can reach the audio-classification project it describes.
     * Resolution is checked when the sources are read; an unknown slug fails
     * rather than rendering a dead link.
     */
    relatedProjects: z.array(slugSchema).optional(),
  })
  .strict();

/**
 * Per-locale article content — the frontmatter of `en.md` and `es.md`.
 *
 * `summary` is the standfirst. It is written once and used three times: under
 * the title on the article, as the entry's line on the index, and as the page's
 * meta description. A minimum length is enforced because a two-word summary
 * produces a useless search result.
 */
export const writingContentSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    summary: z.string().min(10, 'Summary must be at least 10 characters'),
  })
  .strict();

export type WritingMeta = z.infer<typeof writingMetaSchema>;
export type WritingLinks = z.infer<typeof writingLinksSchema>;
export type WritingContent = z.infer<typeof writingContentSchema>;
