import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import Extension from '../Extension';
import { alertMarkers } from '../Utils/alerts';
import type { Extension as CodeMirrorExtension } from '@codemirror/state';

function alertDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(view.state);

  for (const { from, to } of view.visibleRanges) {
    for (const marker of alertMarkers(tree, view.state.doc, from, to)) {
      builder.add(
        marker.from,
        marker.to,
        Decoration.mark({ class: `cm-alert-marker cm-alert-${marker.kind}` }),
      );
    }
  }

  return builder.finish();
}

export default class Alerts extends Extension {
  plugins(): CodeMirrorExtension[] {
    return [
      ViewPlugin.fromClass(
        class {
          decorations: DecorationSet;

          constructor(view: EditorView) {
            this.decorations = alertDecorations(view);
          }

          update(update: ViewUpdate) {
            if (
              update.docChanged ||
              update.viewportChanged ||
              syntaxTree(update.startState) !== syntaxTree(update.state)
            ) {
              this.decorations = alertDecorations(update.view);
            }
          }
        },
        { decorations: (plugin: { decorations: DecorationSet }) => plugin.decorations },
      ),
    ];
  }
}
