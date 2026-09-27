import { syntaxTree } from '@codemirror/language';
import type { EditorState, Text } from '@codemirror/state';

const separator = /^ {0,3}---[ \t]*$/;
const metadataLine = /^[a-z][a-z0-9-]*:[ \t]*/i;

export function isFencedCodeLine(state: EditorState, number: number): boolean {
  const line = state.doc.line(number);

  for (let node = syntaxTree(state).resolveInner(line.from + 1); node; node = node.parent) {
    if (node.name === 'FencedCode') {
      return true;
    }
  }

  return false;
}

function followsSeparator(
  doc: Text,
  lineNumber: number,
  inFencedCode: (number: number) => boolean,
): boolean {
  for (let previous = lineNumber - 1; previous >= 1; previous--) {
    const text = doc.line(previous).text;

    if (!metadataLine.test(text)) {
      return separator.test(text) && !inFencedCode(previous);
    }
  }

  return false;
}

export function sectionMetadataLineNumbers(
  doc: Text,
  firstLine: number,
  finalLine: number,
  inFencedCode: (number: number) => boolean = () => false,
): number[] {
  const result: number[] = [];
  let inMetadata = followsSeparator(doc, firstLine, inFencedCode);

  for (let number = firstLine; number <= finalLine; number++) {
    const text = doc.line(number).text;

    if (separator.test(text) && !inFencedCode(number)) {
      inMetadata = true;
    } else if (inMetadata && metadataLine.test(text)) {
      result.push(number);
    } else {
      inMetadata = false;
    }
  }

  return result;
}
