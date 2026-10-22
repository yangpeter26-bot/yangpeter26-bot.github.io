// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync } from 'node:fs';

const site = 'https://yangpeter26-bot.github.io';
// 历史文章仅有 HTML，作为静态资源保留原网址并加入站点地图。
const legacyPages = readdirSync(new URL('./public/posts/', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => new URL(`/posts/${entry.name}/`, site).href);

export default defineConfig({
  site,
  base: '/',
  output: 'static',
  integrations: [sitemap({ customPages: legacyPages })],
  markdown: {
    shikiConfig: {
      theme: 'catppuccin-mocha',
    },
  },
});
