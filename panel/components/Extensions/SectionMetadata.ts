import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import Extension from '../Extension';
import { isFencedCodeLine, sectionMetadataLineNumbers } from '../Utils/section-metadata';
import type { Extension as CodeMirrorExtension } from '@codemirror/state';

function metadataDecorations(view: EditorView): DecorationSet {
  const doc = view.state.doc;
  const builder = new RangeSetBuilder<Decoration>();
  let lastLine = 0;
  const inFencedCode = (number: number): boolean => isFencedCodeLine(view.state, number);

  for (const { from, to } of view.visibleRanges) {
    const firstLine = Math.max(doc.lineAt(from).number, lastLine + 1);
    const finalLine = doc.lineAt(to).number;

    for (const number of sectionMetadataLineNumbers(doc, firstLine, finalLine, inFencedCode)) {
      const line = doc.line(number);
      builder.add(
        line.from,
        line.from,
        Decoration.line({ attributes: { class: 'cm-section-metadata' } }),
      );
    }

    lastLine = finalLine;
  }

  return builder.finish();
}

export default class SectionMetadata extends Extension {
  plugins(): CodeMirrorExtension[] {
    return [
      ViewPlugin.fromClass(
        class {
          decorations: DecorationSet;

          constructor(view: EditorView) {
            this.decorations = metadataDecorations(view);
          }

          update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
              this.decorations = metadataDecorations(update.view);
            }
          }
        },
        { decorations: (plugin: { decorations: DecorationSet }) => plugin.decorations },
      ),
    ];
  }
}
