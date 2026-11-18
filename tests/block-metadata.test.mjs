import assert from 'node:assert/strict';
import test from 'node:test';
import { Text } from '@codemirror/state';
import { blockMetadata, opensBlockMetadata } from '../panel/components/Utils/block-metadata.ts';
import { sectionMetadataLineNumbers } from '../panel/components/Utils/section-metadata.ts';

const clip = 'https://static.ia.net/2026/11/clip.mp4';

function scan(lines, first = 1, last = lines.length) {
  return blockMetadata(Text.of(lines), first, last);
}

test('marks an HTTPS image or video content block and the keys below it', () => {
  assert.deepEqual(scan(['Intro', `${clip} "Clip"`, 'poster: https://static.ia.net/poster.webp', 'Frame Rate: 60', 'Not metadata', 'key: after']), {
    destinations: [{ line: 2, from: 0, to: clip.length }],
    keys: [
      { line: 3, from: 0, to: 7 },
      { line: 4, from: 0, to: 11 },
    ],
    delimiters: [],
  });
});

test('recognizes the destinations the site renders and leaves other URLs alone', () => {
  const found = scan([
    '<https://static.ia.net/a.webp?v=1#x>',
    '',
    'https://ia.net/writer',
    '',
    'http://static.ia.net/a.webp',
    '',
    '    https://static.ia.net/a.webp',
    '',
    '   https://static.ia.net/a.png (Title (2026))',
  ]);
  assert.deepEqual(found.destinations, [
    { line: 1, from: 0, to: 36 },
    { line: 9, from: 3, to: 30 },
  ]);
});

test('a URL line is a new content block, not metadata', () => {
  const found = scan([clip, 'https://static.ia.net/b.webp', 'alt: B']);
  assert.deepEqual(found.destinations.map(({ line }) => line), [1, 2]);
  assert.deepEqual(found.keys.map(({ line }) => line), [3]);
});

test('marks metadata below a table, after rows that hold a colon', () => {
  const found = scan(['| Name | Value |', '|---|---|', '| URL: a | b |', 'caption: Results', '', 'caption: Paragraph']);
  assert.deepEqual(found.keys, [{ line: 4, from: 0, to: 8 }]);
});

test('delimited metadata needs a closing line and belongs to its block, not a section', () => {
  const lines = [clip, '---', 'caption: Fenced', '---', '', '| A |', '|---|', '---', 'id: open', '', 'Lead', '---', 'id: section'];
  assert.deepEqual(scan(lines), {
    destinations: [{ line: 1, from: 0, to: clip.length }],
    keys: [{ line: 3, from: 0, to: 8 }],
    delimiters: [2, 4],
  });

  const doc = Text.of(lines);
  assert.deepEqual(
    [2, 8, 12].map((line) => opensBlockMetadata(doc, line)),
    [true, false, false],
  );
  assert.deepEqual(
    sectionMetadataLineNumbers(doc, 1, doc.lines, () => false, (line) => opensBlockMetadata(doc, line)),
    [9, 13],
  );
});

test('finds metadata when the visible range starts inside it', () => {
  const found = scan([clip, 'alt: A', 'width: 10', 'height: 20'], 3, 4);
  assert.deepEqual(found.destinations, []);
  assert.deepEqual(found.keys.map(({ line }) => line), [3, 4]);
});

test('skips fenced code', () => {
  const lines = ['```', clip, 'alt: A', '```'];
  const found = blockMetadata(Text.of(lines), 1, lines.length, (line) => line >= 1 && line <= 4);
  assert.deepEqual(found, { destinations: [], keys: [], delimiters: [] });
});
