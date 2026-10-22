import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

function compareIds(a: Post, b: Post): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** One publication policy and stable newest-first ordering for every listing. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => {
    const byDate = b.data.date.localeCompare(a.data.date);
    if (byDate !== 0) return byDate;
    const bySeriesOrder = (b.data.seriesOrder ?? 0) - (a.data.seriesOrder ?? 0);
    return bySeriesOrder || compareIds(a, b);
  });
}

/** Numbered entries come first; ties and unnumbered entries stay deterministic. */
export function compareSeriesPosts(a: Post, b: Post): number {
  const orderA = a.data.seriesOrder ?? Infinity;
  const orderB = b.data.seriesOrder ?? Infinity;
  if (orderA !== orderB) return orderA - orderB;
  return a.data.date.localeCompare(b.data.date) || compareIds(a, b);
}
