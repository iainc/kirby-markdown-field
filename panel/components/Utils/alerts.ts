import type { Text } from '@codemirror/state';
import type { Tree } from '@lezer/common';

const marker = /^( {0,3}> ?)(\[!(note|tip|important|warning|caution)\])[ \t]*$/i;
const quotePrefix = /^ {0,3}> ?/;

export interface AlertMarker {
  from: number;
  to: number;
  kind: string;
}

function hasContent(doc: Text, firstLine: number, finalLine: number): boolean {
  for (let number = firstLine; number <= finalLine; number++) {
    if (doc.line(number).text.replace(quotePrefix, '').trim() !== '') {
      return true;
    }
  }

  return false;
}

export function alertMarkers(tree: Tree, doc: Text, from: number, to: number): AlertMarker[] {
  const result: AlertMarker[] = [];

  tree.iterate({
    from,
    to,
    enter(node) {
      if (node.name === 'Document') {
        return true;
      }

      if (node.name === 'Blockquote') {
        const line = doc.lineAt(node.from);
        const match = line.text.match(marker);

        if (
          match &&
          line.from >= from &&
          hasContent(doc, line.number + 1, doc.lineAt(node.to).number)
        ) {
          const start = line.from + match[1].length;
          result.push({
            from: start,
            to: start + match[2].length,
            kind: match[3].toLowerCase(),
          });
        }
      }

      return false;
    },
  });

  return result;
}
