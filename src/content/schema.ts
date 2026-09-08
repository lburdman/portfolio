/**
 * The project content schema — the single source of truth for project metadata.
 *
 * This file deliberately imports `zod` through `astro/zod` and **never** imports
 * `astro:content`. That is load-bearing:
 *
 *   - `astro:content` is a virtual module that only exists inside a running
 *     Astro build. Importing it here would make this file unusable from Vitest
 *     and from plain Node, which is exactly why the previous test mirrored a
 *     copy of the schema into itself and let it drift.
 *   - `astro/zod` is Astro's own bundled Zod (v4). Importing `zod` directly
 *     would put a second copy of Zod in the dependency tree.
 *
 * `src/content.config.ts`, `tests/content.schema.test.ts` and
 * `scripts/project-validate.mjs` all consume *this* object. There is no copy.
 *
 * The `.ts` extension on the relative import below is intentional: it lets
 * plain Node (>= 22.18, native type stripping) import this module directly,
 * which is how the validation scripts run without a build step. See
 * docs/PROJECT_CONTENT_CONTRACT.md.
 */
import { z } from 'astro/zod';
import { DOMAIN_IDS, isDomainId } from '../config/domains.ts';
import type { DomainId } from '../config/domains.ts';

/** Lowercase, hyphen-separated, no leading/trailing/doubled hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A relative media path inside the entry's own `media/` directory.
 * Absolute paths, parent traversal and backslashes are rejected so a cover can
 * never point outside the entry it belongs to.
 *
 * Exported because `src/content/writing-schema.ts` needs the identical
 * guarantee. Two copies of this regex would be two chances to weaken one of
 * them; the pattern is not project-specific, only media-specific.
 */
export const MEDIA_PATTERN = /^media\/[a-z0-9][a-z0-9._-]*$/i;

export const PROJECT_STATUSES = ['published', 'wip', 'draft'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const slugSchema = z
  .string()
  .regex(SLUG_PATTERN, 'Slug must be lowercase alphanumeric words separated by single hyphens');

/**
 * An external URL.
 *
 * `z.url()` alone is not enough. It is backed by `new URL()`, which happily
 * accepts `javascript:alert(1)` and `data:text/html,...` — and these values are
 * written straight into `href` attributes. The audit flagged this as LOW
 * severity only because the sole content author has commit access; it becomes
 * real the moment content arrives from a pull request. Requiring the literal
 * `https://` prefix closes it, and costs nothing: every link this portfolio
 * publishes is https.
 */
export const externalUrlSchema = z.url().refine((value) => value.startsWith('https://'), {
  message: 'URL must start with https:// (http, javascript: and data: URLs are rejected)',
});

/**
 * A single technical domain id, validated with the runtime guard exported by
 * `src/config/domains.ts`. An unknown domain fails the build rather than
 * rendering an unstyled, unfilterable tag.
 */
export const domainIdSchema = z.custom<DomainId>((value) => typeof value === 'string' && isDomainId(value), {
  message: `Domain must be one of: ${DOMAIN_IDS.join(', ')}`,
});

export const projectLinksSchema = z
  .object({
    github: externalUrlSchema.optional(),
    demo: externalUrlSchema.optional(),
    paper: externalUrlSchema.optional(),
    article: externalUrlSchema.optional(),
  })
  .strict();

/**
 * Shared, locale-independent project metadata. Lives in
 * `src/content/projects/<slug>/project.json`, exactly once per project.
 *
 * `.strict()` is deliberate: a misspelled key (`feautred`) must fail the build
 * instead of being silently dropped and leaving the project unfeatured.
 */
export const projectMetaSchema = z
  .object({
    /** Must equal the directory name. `project-validate` enforces that. */
    slug: slugSchema,

    /**
     * Publication state. `draft` is the only non-public state — see
     * `src/lib/projects/visibility.ts`. Defaults to `draft` so a
     * half-scaffolded project can never leak into a build.
     */
    status: z.enum(PROJECT_STATUSES).default('draft'),

    /** Promotes the project into the homepage's selected set. */
    featured: z.boolean().default(false),

    /** At least one technical domain. Drives accents, filtering and grouping. */
    domains: z.array(domainIdSchema).min(1, 'At least one domain is required'),

    /** Technologies and concepts shown as tags. Not localized — see the contract. */
    stack: z.array(z.string().min(1, 'Stack entries cannot be empty')).min(1, 'At least one stack entry is required'),

    /**
     * Four-digit year the work was done. An integer, not a date string: the
     * site never renders a month or a day, integers sort and compare without
     * parsing, and there is no timezone to get wrong.
     *
     * Optional, because inventing a date for existing work would be a lie.
     */
    year: z
      .number()
      .int('Year must be a whole number')
      .min(1970, 'Year looks implausible')
      .max(2100, 'Year looks implausible')
      .optional(),

    /** Lucas's role, when it adds something a reader cannot infer. */
    role: z.string().min(1).optional(),

    links: projectLinksSchema.optional(),

    /** Path to a cover image, relative to the project directory, e.g. `media/cover.webp`. */
    cover: z
      .string()
      .regex(MEDIA_PATTERN, 'Cover must be a path inside this project, e.g. "media/cover.webp"')
      .optional(),

    /** Ascending sort key. Lower sorts first; equal orders fall back to title. */
    order: z.number().int('Order must be a whole number').min(0, 'Order cannot be negative').default(99),

    /** Slugs of other projects. `project-validate` checks that they resolve. */
    related: z.array(slugSchema).optional(),
  })
  .strict();

/**
 * The only genuinely localized fields. Everything else is shared, which is the
 * whole point of splitting `project.json` from `en.md` / `es.md`.
 */
export const projectContentSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    summary: z.string().min(10, 'Summary must be at least 10 characters'),
  })
  .strict();

export type ProjectMeta = z.infer<typeof projectMetaSchema>;
export type ProjectLinks = z.infer<typeof projectLinksSchema>;
export type ProjectContent = z.infer<typeof projectContentSchema>;
