import { tags } from '@lezer/highlight';
import type { Line, MarkdownExtension } from '@lezer/markdown';

function isComment(line: Line): boolean {
  return line.indent - line.baseIndent < 4 && line.text.startsWith('//', line.pos);
}

export const Comments: MarkdownExtension = {
  defineNodes: [{ name: 'LineComment', block: true, style: tags.lineComment }],
  parseBlock: [
    {
      name: 'LineComment',
      before: 'HTMLBlock',
      parse(cx, line) {
        if (!isComment(line)) {
          return false;
        }
        cx.addElement(
          cx.elt('LineComment', cx.lineStart + line.pos, cx.lineStart + line.text.length),
        );
        cx.nextLine();
        return true;
      },
      endLeaf(_cx, line) {
        return isComment(line);
      },
    },
  ],
};
