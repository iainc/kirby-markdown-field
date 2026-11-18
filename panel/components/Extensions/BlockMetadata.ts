import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import Extension from '../Extension';
import { blockMetadata } from '../Utils/block-metadata';
import { isFencedCodeLine } from '../Utils/section-metadata';
import type { Extension as CodeMirrorExtension } from '@codemirror/state';

const destinationMark = Decoration.mark({ class: 'cm-content-block-destination' });
const keyMark = Decoration.mark({ class: 'cm-metadata-key' });
const metadataLine = Decoration.line({ attributes: { class: 'cm-block-metadata' } });
const delimiterLine = Decoration.line({ attributes: { class: 'cm-block-metadata cm-metadata-delimiter' } });

function decorations(view: EditorView): DecorationSet {
  const doc = view.state.doc;
  const builder = new RangeSetBuilder<Decoration>();
  const inFencedCode = (number: number): boolean => isFencedCodeLine(view.state, number);
  let lastLine = 0;

  for (const { from, to } of view.visibleRanges) {
    const firstLine = Math.max(doc.lineAt(from).number, lastLine + 1);
    const finalLine = doc.lineAt(to).number;
    if (firstLine > finalLine) {
      continue;
    }

    const found = blockMetadata(doc, firstLine, finalLine, inFencedCode);
    // A line decoration comes before a mark at the same position.
    const ranges = [
      ...found.destinations.map((range) => ({ ...range, rank: 1, decoration: destinationMark })),
      ...found.keys.map(({ line }) => ({ line, from: 0, to: 0, rank: 0, decoration: metadataLine })),
      ...found.keys.map((range) => ({ ...range, rank: 1, decoration: keyMark })),
      ...found.delimiters.map((line) => ({ line, from: 0, to: 0, rank: 0, decoration: delimiterLine })),
    ].sort((a, b) => a.line - b.line || a.from - b.from || a.rank - b.rank);

    for (const { line, from: start, to: end, decoration } of ranges) {
      const lineFrom = doc.line(line).from;
      builder.add(lineFrom + start, lineFrom + end, decoration);
    }

    lastLine = finalLine;
  }

  return builder.finish();
}

export default class BlockMetadata extends Extension {
  plugins(): CodeMirrorExtension[] {
    return [
      ViewPlugin.fromClass(
        class {
          decorations: DecorationSet;

          constructor(view: EditorView) {
            this.decorations = decorations(view);
          }

          update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
              this.decorations = decorations(update.view);
            }
          }
        },
        { decorations: (plugin: { decorations: DecorationSet }) => plugin.decorations },
      ),
    ];
  }
}
