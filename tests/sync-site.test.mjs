import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { syncSite } from '../scripts/sync-site.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'blog-sync-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (name, text = name) => { mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), text); };
  for (const name of ['index.html', '404.html', 'rss.xml', 'sitemap-index.xml', '.nojekyll']) put(`dist/${name}`);
  put('.deploy-manifest.json', JSON.stringify({ version: 1, files: ['index.html', 'posts/old/index.html'] }));
  put('index.html', 'old home');
  put('posts/old/index.html', 'old post');
  put('src/private.md', 'source');
  put('notes.txt', 'unmanaged');
  return { root, put };
}

test('预览无写入；同步清理受管旧文件、保留源码和未受管文件，并备份旧内容', (t) => {
  const { root } = fixture(t);
  const plan = syncSite(root, { dryRun: true });
  assert.deepEqual(plan.removed, ['posts/old/index.html']);
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), 'old home');
  assert.equal(existsSync(join(root, '.deploy-backups')), false);
  const result = syncSite(root);
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), 'dist/index.html');
  assert.equal(existsSync(join(root, 'posts/old/index.html')), false);
  assert.equal(readFileSync(join(root, 'src/private.md'), 'utf8'), 'source');
  assert.equal(readFileSync(join(root, 'notes.txt'), 'utf8'), 'unmanaged');
  assert.equal(readFileSync(join(result.backup, 'index.html'), 'utf8'), 'old home');
  assert.equal(readFileSync(join(result.backup, 'posts/old/index.html'), 'utf8'), 'old post');
  const repeat = syncSite(root);
  assert.deepEqual([repeat.created, repeat.updated, repeat.removed], [[], [], []]);
});

test('路径越界与源码覆盖会在任何改动之前被拒绝', (t) => {
  for (const name of ['../outside.txt', 'src/private.md', 'SRC/private.md', 'PACKAGE.JSON', '.git/config', 'C:/outside.txt', 'posts/../private.md', 'src./private.md', 'src /private.md', 'NUL.txt']) {
    const { root, put } = fixture(t);
    put('.deploy-manifest.json', JSON.stringify({ version: 1, files: [name] }));
    assert.throws(() => syncSite(root), /非发布路径/);
    assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), 'old home');
  }
});

test('不完整构建保持现有发布文件', (t) => {
  const { root } = fixture(t);
  rmSync(join(root, 'dist/rss.xml'));
  assert.throws(() => syncSite(root), /构建缺少 rss.xml/);
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), 'old home');
});

test('损坏的符号链接也会在写入前被拒绝', (t) => {
  const { root, put } = fixture(t);
  put('dist/media/new.txt', 'new asset');
  try {
    symlinkSync(join(root, 'missing-directory'), join(root, 'media'), 'junction');
  } catch (error) {
    if (error.code === 'EPERM') { t.skip('当前系统未开放创建测试链接'); return; }
    throw error;
  }
  assert.throws(() => syncSite(root), /符号链接/);
  assert.equal(readFileSync(join(root, 'index.html'), 'utf8'), 'old home');
});
