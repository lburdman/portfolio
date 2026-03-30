import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Flat color names to avoid Tailwind DEFAULT suffix issues
        'bg-base': '#0a0a0f',
        'surface': '#12121a',
        'surface-elevated': '#12121a',
        'surface-border': '#1e1e2e',
        'surface-highlight': '#252535',
        'text-primary': '#e8e8f0',
        'text-secondary': '#8888a0',
        'text-muted': '#55556a',
        'accent': '#6366f1',
        'accent-hover': '#818cf8',
        'accent-faint': 'rgba(99,102,241,0.12)',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', 'Fira Code', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      maxWidth: {
        content: '72rem',
      },
      spacing: {
        section: '6rem',
      },
      borderRadius: {
        card: '0.75rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
