import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('RSS generation requires site in astro.config.mjs');

  const posts = await getPublishedPosts();
  const siteUrl = new URL(site);
  if (!siteUrl.pathname.endsWith('/')) siteUrl.pathname += '/';
  const feedUrl = new URL('rss.xml', siteUrl).href;
  const items = posts.map((post) => {
    const path = post.id.split('/').map(encodeURIComponent).join('/');
    const link = escapeXml(new URL(`posts/${path}/`, siteUrl).href);
    const categories = post.data.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('');
    return `<item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(post.data.excerpt)}</description>
      <pubDate>${new Date(`${post.data.date}T00:00:00.000Z`).toUTCString()}</pubDate>
      ${categories}
    </item>`;
  }).join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>yyg 的笔记</title>
    <link>${escapeXml(siteUrl.href)}</link>
    <description>记录技术探索、学习笔记与项目实践。</description>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
