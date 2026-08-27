#!/usr/bin/env node
/**
 * Rasterises `public/og-default.svg` into `public/og-default.png`.
 *
 * Why this exists: the social card is authored as SVG because that is the
 * editable, reviewable, version-controllable form. But LinkedIn, Slack and
 * WhatsApp all reject `og:image` values that are SVG, so what actually ships
 * in the meta tag has to be a PNG.
 *
 * The PNG is committed, not generated at build time — it changes about once a
 * year and this keeps `sharp` out of the deploy path. Re-run after editing the
 * SVG:
 *
 *     node scripts/og-generate.mjs
 *
 * `sharp` is already present as a transitive dependency of Astro's image
 * pipeline; it is deliberately not added to package.json for this one script.
 *
 * NOTE ON FONTS: sharp renders SVG text with the fonts installed on the machine
 * running it. The SVG uses a generic family stack for exactly this reason, but
 * the rasterised result can still differ between machines. Always eyeball the
 * output PNG after regenerating.
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = 'public/og-default.svg';
const OUTPUT = 'public/og-default.png';
const WIDTH = 1200;
const HEIGHT = 630;

const svg = readFileSync(SOURCE);

await sharp(svg, { density: 200 })
  .resize(WIDTH, HEIGHT, { fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(OUTPUT);

console.log(`Wrote ${OUTPUT} (${WIDTH}x${HEIGHT}) from ${SOURCE}`);
