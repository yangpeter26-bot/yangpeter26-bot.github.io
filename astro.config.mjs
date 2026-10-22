// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkLeadingTitle from './src/lib/remark-leading-title.mjs';

const site = 'https://yangpeter26-bot.github.io';
export default defineConfig({
  site,
  base: '/',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkLeadingTitle, remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: 'catppuccin-mocha',
      langAlias: { jsp: 'html' },
    },
  },
});
