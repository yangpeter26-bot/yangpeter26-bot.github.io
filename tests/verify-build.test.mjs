import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyBuild } from '../scripts/verify-build.mjs';

test('链接按部署端大小写精确匹配，目录须有 index.html', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'blog-links-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (name, content) => { mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), content); };
  put('.nojekyll', '');
  put('rss.xml', '<rss><channel><item></item></channel></rss>');
  for (const slug of ['metasploitable2-samba', 'metasploitable2-telnet', 'metasploitable2-tomcat', 'metasploitable2-vsftpd', 'vulhub-1']) put(`posts/${slug}/index.html`, '<p>old</p>');
  put('avatar.jpg', 'image');
  put('assets/file.txt', 'asset');
  put('index.html', '<img src="/AVATAR.jpg"><a href="/assets/">assets</a>');
  assert.throws(() => verifyBuild(root), /内部链接缺失/);
  put('index.html', '<img src="/avatar.jpg"><a href="/assets/">assets</a>');
  assert.throws(() => verifyBuild(root), /内部链接缺失/);
  put('assets/index.html', '<a href="/">Home</a>');
  assert.equal(verifyBuild(root), 7);
});
