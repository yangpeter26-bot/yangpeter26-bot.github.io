import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/posts';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const index = posts.map((post) => ({
    title: post.data.title,
    excerpt: post.data.excerpt,
    tags: post.data.tags,
    series: post.data.series === 'd2l' ? '动手学深度学习 d2l' : post.data.series ?? '',
    date: post.data.date,
    url: `/posts/${post.id}/`,
  }));
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
