import assert from 'node:assert/strict';
import test from 'node:test';
import { Text } from '@codemirror/state';
import { sectionMetadataLineNumbers } from '../panel/components/Utils/section-metadata.ts';

function metadataLines(lines, first = 1, last = lines.length) {
  return sectionMetadataLineNumbers(Text.of(lines), first, last);
}

test('styles consecutive section keys and stops at the first non-key line', () => {
  assert.deepEqual(
    metadataLines([
      'Lead',
      '---',
      'id: compare',
      'layout: comparison',
      '',
      'intro: ordinary text',
      '---',
      '# Heading',
      'key: ordinary text',
    ]),
    [3, 4],
  );
});

test('uses the section separator and key syntax accepted by the site', () => {
  assert.deepEqual(
    metadataLines(['    ---', 'id: ordinary', '   --- \t', 'A-b:value', 'z:', 'x_bad: stop', 'theme: ordinary']),
    [4, 5],
  );
});

test('recognizes metadata when the visible range starts inside its block', () => {
  const lines = ['Lead', '---', 'id: compare', 'layout: comparison', 'theme: grey', '', '# Title'];

  assert.deepEqual(metadataLines(lines, 4, 5), [4, 5]);
  assert.deepEqual(metadataLines(lines, 5, 7), [5]);
});

test('starts a new block after another separator', () => {
  assert.deepEqual(metadataLines(['---', '---', 'id: second']), [3]);
});

test('does not resume metadata after an invalid line', () => {
  assert.deepEqual(metadataLines(['---', 'id: one', 'ordinary line', 'layout: no', '---', 'theme: yes']), [2, 6]);
});
