import type { Post } from './posts';

export const TOPICS = [
  { id: 'violet', label: '深度学习', description: '从原理到实现，把公式和代码连起来。', shortDescription: '从原理到实现' },
  { id: 'blue', label: '安全与探索', description: '记录安全实践中的问题、过程和思考。', shortDescription: '在实践里理解' },
  { id: 'mint', label: '工具与实践', description: '收集日常使用的工具，也记录折腾的过程。', shortDescription: '记录好用的工具' },
] as const;

export function getTopic(post: Post): { label: string; tone: string } {
  if (post.data.series === 'd2l' || post.data.tags.includes('Deep Learning')) return { label: '深度学习', tone: 'violet' };
  if (post.data.tags.some((tag) => /AI|Tools|Hermes/i.test(tag))) return { label: '工具与实践', tone: 'mint' };
  return { label: '安全与探索', tone: 'blue' };
}
