import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import {
  isFencedCodeLine,
  sectionMetadataLineNumbers,
} from '../panel/components/Utils/section-metadata.ts';

test('does not style separators and keys inside fenced Markdown code', () => {
  const lines = [
    '~~~markdown',
    '---',
    'id: hidden',
    '~~~',
    '',
    '---',
    'id: hero',
    'layout: hero',
  ];
  const state = EditorState.create({
    doc: lines.join('\n'),
    extensions: [markdown({ base: markdownLanguage })],
  });
  const inFencedCode = (number) => isFencedCodeLine(state, number);

  assert.deepEqual(sectionMetadataLineNumbers(state.doc, 1, lines.length, inFencedCode), [7, 8]);
  assert.deepEqual(sectionMetadataLineNumbers(state.doc, 3, 3, inFencedCode), []);
});
