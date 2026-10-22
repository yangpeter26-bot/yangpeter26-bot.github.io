import test from 'node:test';
import assert from 'node:assert/strict';
import { removeLeadingPostTitle } from '../src/lib/remark-leading-title.mjs';

const post = { path: 'C:\\blog\\src\\content\\posts\\example.md' };

test('removes the article title after frontmatter and definitions, preserving body headings', () => {
  const tree = { children: [
    { type: 'yaml' }, { type: 'definition' }, { type: 'heading', depth: 1 },
    { type: 'paragraph' }, { type: 'heading', depth: 2 },
  ] };
  removeLeadingPostTitle(tree, post);
  assert.deepEqual(tree.children.map((node) => [node.type, node.depth]), [
    ['yaml', undefined], ['definition', undefined], ['paragraph', undefined], ['heading', 2],
  ]);
});

test('keeps H1 headings when an article has already started', () => {
  const tree = { children: [{ type: 'paragraph' }, { type: 'heading', depth: 1 }] };
  removeLeadingPostTitle(tree, post);
  assert.equal(tree.children.length, 2);
});

test('keeps other Markdown pages and leading H2 headings intact', () => {
  const page = { children: [{ type: 'heading', depth: 1 }] };
  removeLeadingPostTitle(page, { path: '/blog/src/pages/about.md' });
  assert.equal(page.children.length, 1);
  const article = { children: [{ type: 'heading', depth: 2 }] };
  removeLeadingPostTitle(article, post);
  assert.equal(article.children.length, 1);
});

test('handles an empty document', () => {
  const tree = { children: [] };
  removeLeadingPostTitle(tree, post);
  assert.deepEqual(tree.children, []);
});
