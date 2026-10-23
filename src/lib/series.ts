import { compareSeriesPosts, type Post } from './posts';

const seriesDetails: Record<string, { title: string; description: string; icon: string }> = {
  d2l: { title: '动手学深度学习', description: '从线性回归到卷积网络，记录概念、代码和理解过程。', icon: '◈' },
  metasploitable2: { title: 'Metasploitable2 学习记录', description: '按服务逐步学习信息收集、原理分析和本地漏洞复现。', icon: '⌘' },
  vulhub: { title: 'Vulhub 漏洞复现笔记', description: '从环境搭建开始，记录漏洞原理与复现中的问题。', icon: '◎' },
  'ctf-web-basics': { title: 'CTF Web 基础三题', description: '三道基础题串起注入、命令执行和过滤绕过的通用思路。', icon: '⌗' },
};

export function getSeriesDetails(id: string): { title: string; description: string; icon: string } {
  return seriesDetails[id] ?? { title: id, description: '循序阅读这一组学习笔记。', icon: '◇' };
}

export interface PostSeries {
  id: string;
  title: string;
  description: string;
  icon: string;
  posts: Post[];
}

export function groupPostsBySeries(posts: Post[]): PostSeries[] {
  const grouped = new Map<string, Post[]>();
  for (const post of posts) {
    if (!post.data.series) continue;
    const entries = grouped.get(post.data.series) ?? [];
    entries.push(post);
    grouped.set(post.data.series, entries);
  }
  return [...grouped].map(([id, entries]) => ({ id, ...getSeriesDetails(id), posts: entries.sort(compareSeriesPosts) }))
    .sort((a, b) => b.posts.length - a.posts.length || a.id.localeCompare(b.id));
}
