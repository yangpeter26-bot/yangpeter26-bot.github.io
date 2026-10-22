import assert from 'node:assert/strict';
import test from 'node:test';
import { getReadingTimeMinutes } from '../src/lib/reading-time.ts';

test('Chinese prose counts characters without relying on spaces', () => {
  assert.equal(getReadingTimeMinutes('汉'.repeat(600)), 2);
});

test('English prose and mixed Chinese/English combine their reading time', () => {
  assert.equal(getReadingTimeMinutes('word '.repeat(400)), 2);
  assert.equal(getReadingTimeMinutes('汉'.repeat(300) + ' word'.repeat(200)), 2);
});

test('code identifiers and literals still contribute to reading time', () => {
  assert.equal(getReadingTimeMinutes('```js\n' + 'const answer = 42;\n'.repeat(200) + '```'), 3);
});

test('empty or missing content keeps the one-minute minimum', () => {
  assert.equal(getReadingTimeMinutes(), 1);
  assert.equal(getReadingTimeMinutes(''), 1);
  assert.equal(getReadingTimeMinutes(' \n\t '), 1);
});
