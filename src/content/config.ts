import { defineCollection, z } from 'astro:content';

const projectSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  // projectSlug is the URL slug used for routing (e.g. "augmenta").
  // It is separate from the Astro content collection slug (the filename).
  projectSlug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  lang: z.enum(['en', 'es']),
  tags: z.array(z.string().min(1)).min(1, 'At least one tag is required'),
  featured: z.boolean().default(false),
  status: z.enum(['published', 'draft', 'wip']).default('published'),
  github: z.string().url().optional(),
  demo: z.string().url().optional(),
  coverImage: z.string().optional(),
  order: z.number().int().min(0).default(99),
});

const noteSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  lang: z.enum(['en', 'es']),
  publishedAt: z.date().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['published', 'draft']).default('draft'),
});

const projects = defineCollection({
  type: 'content',
  schema: projectSchema,
});

const notes = defineCollection({
  type: 'content',
  schema: noteSchema,
});

export const collections = { projects, notes };
export type ProjectFrontmatter = z.infer<typeof projectSchema>;
export type NoteFrontmatter = z.infer<typeof noteSchema>;
