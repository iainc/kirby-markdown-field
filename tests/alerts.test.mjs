import assert from 'node:assert/strict';
import test from 'node:test';
import { Text } from '@codemirror/state';
import { parser } from '@lezer/markdown';
import { Comments } from '../panel/components/Extensions/Comments.ts';
import { alertMarkers } from '../panel/components/Utils/alerts.ts';

const markdown = parser.configure(Comments);

function markers(source, from = 0, to = source.length) {
  const doc = Text.of(source.split('\n'));
  return alertMarkers(markdown.parse(source), doc, from, to).map((marker) => [
    source.slice(marker.from, marker.to),
    marker.kind,
  ]);
}

// These cases follow Frameworks/Markdown/spec.txt, “Alerts (WFM, PFM)”, in Writer.
test('finds each alert kind, ignoring case and trailing whitespace', () => {
  assert.deepEqual(
    markers(
      '> [!NOTE]\n> Note.\n\n> [!tip]\n> Tip.\n\n>[!Important]\n>Important.\n\n   > [!WARNING]  \n> Warning.\n\n> [!CAUTION]\n> Caution.',
    ),
    [
      ['[!NOTE]', 'note'],
      ['[!tip]', 'tip'],
      ['[!Important]', 'important'],
      ['[!WARNING]', 'warning'],
      ['[!CAUTION]', 'caution'],
    ],
  );
});

test('accepts lazy continuation and content after a blank quote line', () => {
  assert.deepEqual(markers('> [!warning]\nContinued lazily.'), [['[!warning]', 'warning']]);
  assert.deepEqual(markers('> [!NOTE]\n>\n> Body.'), [['[!NOTE]', 'note']]);
});

test('leaves ordinary quote text unstyled', () => {
  for (const source of [
    '> [!NOTE] Title\n> Body.',
    '> [!NOTE]',
    '> [!NOTE]\n>',
    '> [!NOTE]\n\nBody.',
    '>  [!NOTE]\n> Body.',
    '> [!OTHER]\n> Body.',
    '> Before\n> [!NOTE]\n> Body.',
  ]) {
    assert.deepEqual(markers(source), [], source);
  }
});

test('requires a top-level quote', () => {
  for (const source of [
    '> > [!NOTE]\n> > Body.',
    '- > [!NOTE]\n  > Body.',
    '```\n> [!NOTE]\n> Body.\n```',
    '    > [!NOTE]\n    > Body.',
    '// > [!NOTE]\n// > Body.',
  ]) {
    assert.deepEqual(markers(source), [], source);
  }
});

test('reports a marker once, only for the range that starts its line', () => {
  const source = '> [!NOTE]\n> Long body.\n\n> [!TIP]\n> Body.';
  const secondQuote = source.indexOf('> [!TIP]');
  assert.deepEqual(markers(source, source.indexOf('Long'), secondQuote - 1), []);
  assert.deepEqual(markers(source, secondQuote, source.length), [['[!TIP]', 'tip']]);
});
