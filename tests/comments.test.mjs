import assert from 'node:assert/strict';
import test from 'node:test';
import { parser } from '@lezer/markdown';
import { Comments } from '../panel/components/Extensions/Comments.ts';

const markdown = parser.configure(Comments);

function nodes(source, name) {
  const ranges = [];
  markdown.parse(source).iterate({
    enter(node) {
      if (node.name === name) ranges.push(source.slice(node.from, node.to));
    },
  });
  return ranges;
}

test('recognizes each commented line without requiring a space after the marker', () => {
  assert.deepEqual(nodes('// # Hidden\n//\n//hidden\nVisible', 'LineComment'), [
    '// # Hidden',
    '//',
    '//hidden',
  ]);
  assert.deepEqual(nodes('// # Hidden\nVisible', 'ATXHeading1'), []);
});

test('accepts up to three leading spaces and preserves indented code', () => {
  assert.deepEqual(nodes('   // hidden\n\n    // visible', 'LineComment'), ['// hidden']);
  assert.deepEqual(nodes('    // visible', 'CodeText'), ['// visible']);
});

test('interrupts paragraphs and recognizes comments in lists and blockquotes', () => {
  assert.deepEqual(nodes('Before\n// hidden\nAfter', 'Paragraph'), ['Before', 'After']);
  assert.deepEqual(nodes('foo `first\n// hidden\nlast`', 'Paragraph'), ['foo `first', 'last`']);
  assert.deepEqual(nodes('> // hidden\n> visible', 'LineComment'), ['// hidden']);
  assert.deepEqual(nodes('- one\n  // hidden\n  visible', 'LineComment'), ['// hidden']);
  assert.deepEqual(nodes('- // hidden\n- visible', 'LineComment'), ['// hidden']);
});

test('leaves comments literal inside fenced code and raw HTML', () => {
  for (const source of [
    '```js\n// visible\n```',
    '~~~\n// visible\n~~~',
    '```\n// visible',
    '<script>\n// visible\n</script>',
    '<pre>\n// visible\n</pre>',
    '<!--\n// visible\n-->',
    '`// visible`',
    'Text // visible',
    'https://example.com',
  ]) {
    assert.deepEqual(nodes(source, 'LineComment'), [], source);
  }
});

test('keeps headings, HTML, and definitions inside comments out of the syntax tree', () => {
  const source = '// # Hidden\n// <table>\n// [hidden]: /url\nVisible';
  for (const name of ['ATXHeading1', 'HTMLBlock', 'LinkReference']) {
    assert.deepEqual(nodes(source, name), [], name);
  }
  assert.deepEqual(nodes(source, 'Paragraph'), ['Visible']);
});
