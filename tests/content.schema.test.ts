import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the project schema from content/config.ts for unit testing
const projectSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  projectSlug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
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

type ProjectFrontmatter = z.infer<typeof projectSchema>;

describe('Project Schema Validation', () => {
  const validProject: ProjectFrontmatter = {
    title: 'Augmenta',
    projectSlug: 'augmenta',
    summary: 'A privacy layer for LLM workflows with PII detection and anonymization.',
    lang: 'en',
    tags: ['Privacy', 'LLM', 'Python'],
    featured: true,
    status: 'published',
    github: 'https://github.com/lburdman/augmenta',
    order: 1,
  };

  it('accepts a valid project', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const result = projectSchema.safeParse({ ...validProject, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug (contains uppercase)', () => {
    const result = projectSchema.safeParse({ ...validProject, projectSlug: 'MyProject' });
    expect(result.success).toBe(false);
  });

  it('rejects slug with spaces', () => {
    const result = projectSchema.safeParse({ ...validProject, projectSlug: 'my project' });
    expect(result.success).toBe(false);
  });

  it('accepts slug with hyphens', () => {
    const result = projectSchema.safeParse({ ...validProject, projectSlug: 'my-project-123' });
    expect(result.success).toBe(true);
  });

  it('rejects summary that is too short', () => {
    const result = projectSchema.safeParse({ ...validProject, summary: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid language', () => {
    const result = projectSchema.safeParse({ ...validProject, lang: 'fr' });
    expect(result.success).toBe(false);
  });

  it('rejects empty tags array', () => {
    const result = projectSchema.safeParse({ ...validProject, tags: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid GitHub URL', () => {
    const result = projectSchema.safeParse({ ...validProject, github: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts project without optional github field', () => {
    const { github: _, ...withoutGithub } = validProject;
    const result = projectSchema.safeParse(withoutGithub);
    expect(result.success).toBe(true);
  });

  it('defaults featured to false', () => {
    const { featured: _, ...withoutFeatured } = validProject;
    const result = projectSchema.safeParse(withoutFeatured);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBe(false);
    }
  });

  it('defaults status to published', () => {
    const { status: _, ...withoutStatus } = validProject;
    const result = projectSchema.safeParse(withoutStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('published');
    }
  });

  it('rejects invalid status value', () => {
    const result = projectSchema.safeParse({ ...validProject, status: 'archived' });
    expect(result.success).toBe(false);
  });
});

describe('All featured projects validate against schema', () => {
  const featuredProjects: ProjectFrontmatter[] = [
    {
      title: 'Augmenta',
      projectSlug: 'augmenta',
      summary: 'A proof-of-concept privacy layer for LLM workflows focused on PII detection and anonymization.',
      lang: 'en',
      tags: ['Privacy', 'LLM', 'Python', 'FastAPI', 'Docker', 'Applied AI'],
      featured: true,
      status: 'published',
      github: 'https://github.com/lburdman/augmenta',
      order: 1,
    },
    {
      title: 'Energy Demand Forecasting',
      projectSlug: 'energy-forecasting',
      summary: 'A 24-hour ahead electricity demand forecasting pipeline with feature engineering and rolling-origin validation.',
      lang: 'en',
      tags: ['Machine Learning', 'Time Series', 'Python', 'Scikit-learn', 'Forecasting', 'XGBoost'],
      featured: true,
      status: 'published',
      github: 'https://github.com/lburdman/energy-demand-forecasting',
      order: 2,
    },
    {
      title: 'Hybrid Classical–Quantum Neural Networks for Audio Emotion Classification',
      projectSlug: 'quantum-audio',
      summary: 'An end-to-end speech emotion recognition pipeline on CREMA-D using mel-spectrograms and hybrid quantum/classical heads.',
      lang: 'en',
      tags: ['Quantum ML', 'PyTorch', 'PennyLane', 'Speech Processing', 'Deep Learning'],
      featured: true,
      status: 'published',
      github: 'https://github.com/lburdman/qnn-speech-recognition',
      order: 3,
    },
    {
      title: 'Support Ticket Classifier',
      projectSlug: 'support-classifier',
      summary: 'An AI-assisted support ticket classifier with validated structured outputs and deterministic fallbacks.',
      lang: 'en',
      tags: ['AI', 'NLP', 'Python', 'Pydantic', 'Anthropic', 'Classification'],
      featured: true,
      status: 'published',
      github: 'https://github.com/lburdman/support-ticket-classifier',
      order: 4,
    },
  ];

  it('all featured projects have valid slugs', () => {
    for (const project of featuredProjects) {
      expect(project.projectSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('all featured projects pass schema validation', () => {
    for (const project of featuredProjects) {
      const result = projectSchema.safeParse(project);
      expect(result.success, `Project "${project.title}" failed schema validation`).toBe(true);
    }
  });

  it('all featured projects have at least one tag', () => {
    for (const project of featuredProjects) {
      expect(project.tags.length).toBeGreaterThan(0);
    }
  });

  it('featured projects are ordered correctly without gaps', () => {
    const orders = featuredProjects.map((p) => p.order).sort((a, b) => a - b);
    expect(orders[0]).toBe(1);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBe(orders[i - 1]! + 1);
    }
  });
});
