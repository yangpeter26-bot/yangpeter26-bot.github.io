import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? walk(join(dir, item.name)) : [join(dir, item.name)]);
}
export function verifyBuild(directory) {
  const root = resolve(directory);
  const files = walk(root);
  const relativeFiles = new Set(files.map((file) => file.slice(root.length + 1).replaceAll('\\', '/')));
  const htmlFiles = files.filter((file) => extname(file) === '.html');
  const broken = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const pathname = '/' + file.slice(root.length + 1).replaceAll('\\', '/').replace(/index\.html$/, '');
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (raw.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
      const url = new URL(raw.replaceAll('&amp;', '&'), `https://local.invalid${pathname}`);
      const target = decodeURIComponent(url.pathname).slice(1);
      const index = target.replace(/\/$/, '') + (target ? '/' : '') + 'index.html';
      if (!relativeFiles.has(target) && !relativeFiles.has(index)) broken.push(`${pathname} → ${raw}`);
    }
}
assert.deepEqual(broken, [], `内部链接缺失：\n${broken.join('\n')}`);
for (const slug of ['metasploitable2-samba', 'metasploitable2-telnet', 'metasploitable2-tomcat', 'metasploitable2-vsftpd', 'vulhub-1']) {
  assert.ok(relativeFiles.has(`posts/${slug}/index.html`), `历史网址缺失：${slug}`);
}
assert.ok(relativeFiles.has('.nojekyll'));
const feed = readFileSync(join(root, 'rss.xml'), 'utf8');
assert.match(feed, /<rss\b/);
assert.match(feed, /<item>/);
return htmlFiles.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = verifyBuild(fileURLToPath(new URL('../dist/', import.meta.url)));
  console.log(`构建校验通过：${count} 个 HTML 页面，内部链接完整，历史文章和 RSS 已保留。`);
}
