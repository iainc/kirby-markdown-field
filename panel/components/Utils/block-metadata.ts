import type { Text } from '@codemirror/state';

// Writer content blocks with an HTTPS image or video, and the metadata below them or below a
// table, as the site's renderer reads them.
const contentBlock =
  /^ {0,3}(?:<(https:\/\/[^\s<>]+)>|(https:\/\/\S+))(?:[ \t]+(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.|\((?:[^()\\]|\\.)*\))*\)))?[ \t]*$/i;
const mediaPath = /\.(?:apng|bmp|gif|jp2|jpeg|jpg|png|svg|tif|tiff|webp|m4v|mov|mp4|webm)$/i;
const tableDelimiter = /^ {0,3}(?:\|[ ]*[-:]+[-| :]*|[-:]+[ ]*\|[-| :]*)$/;
const separator = /^---[ \t]*$/;
// A line with an absolute URL is no metadata item.
const metadataKey = /^[\p{L}\p{N}](?:[\p{L}\p{N} \t_.-]|\\[:\\])*:(?!\/\/)/u;

export interface Range {
  line: number;
  from: number;
  to: number;
}

export interface BlockMetadata {
  destinations: Range[];
  keys: Range[];
  delimiters: number[];
}

function destination(text: string): { from: number; to: number } | null {
  const match = contentBlock.exec(text);
  const url = match?.[1] ?? match?.[2];
  if (!match || !url) {
    return null;
  }

  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    return null;
  }
  if (!mediaPath.test(path)) {
    return null;
  }

  const from = text.indexOf(match[1] ? `<${url}>` : url);
  return { from, to: from + url.length + (match[1] ? 2 : 0) };
}

function key(text: string): number | null {
  const match = metadataKey.exec(text);
  return match ? match[0].length : null;
}

function isBlank(text: string): boolean {
  return text.trim() === '';
}

// The line of the closing `---` when the line opens delimited metadata, or null.
function closingDelimiter(doc: Text, number: number): number | null {
  if (!separator.test(doc.line(number).text) || number >= doc.lines || key(doc.line(number + 1).text) === null) {
    return null;
  }

  for (let next = number + 2; next <= doc.lines; next++) {
    const text = doc.line(next).text;
    if (isBlank(text)) {
      return null;
    }
    if (separator.test(text)) {
      return next;
    }
  }

  return null;
}

function endsTable(doc: Text, number: number): boolean {
  for (let row = number; row >= 2 && doc.line(row).text.includes('|'); row--) {
    if (tableDelimiter.test(doc.line(row).text) && doc.line(row - 1).text.includes('|')) {
      return true;
    }
  }

  return false;
}

export function opensBlockMetadata(doc: Text, number: number): boolean {
  if (number < 2) {
    return false;
  }

  const previous = doc.line(number - 1).text;
  return (destination(previous) !== null || endsTable(doc, number - 1)) && closingDelimiter(doc, number) !== null;
}

export function blockMetadata(
  doc: Text,
  firstLine: number,
  finalLine: number,
  inFencedCode: (number: number) => boolean = () => false,
): BlockMetadata {
  const result: BlockMetadata = { destinations: [], keys: [], delimiters: [] };
  let start = firstLine;
  while (start > 1 && !isBlank(doc.line(start - 1).text)) {
    start--;
  }

  let owner = false;
  let table = false;
  let metadata = false;
  for (let number = start; number <= finalLine; number++) {
    const text = doc.line(number).text;
    const visible = number >= firstLine;

    if (isBlank(text) || inFencedCode(number)) {
      owner = table = metadata = false;
      continue;
    }

    const keyLength = key(text);
    // A line that forms a table row takes precedence over metadata.
    if (keyLength !== null && (metadata || (owner && !(table && text.includes('|'))))) {
      if (visible) {
        result.keys.push({ line: number, from: 0, to: keyLength });
      }
      owner = table = false;
      metadata = true;
      continue;
    }
    metadata = false;

    if (table && text.includes('|')) {
      owner = true;
      continue;
    }

    if (owner) {
      const closing = closingDelimiter(doc, number);
      if (closing !== null) {
        for (let line = number; line <= closing; line++) {
          const lineKey = key(doc.line(line).text);
          if (line >= firstLine && line <= finalLine) {
            if (line === number || line === closing) {
              result.delimiters.push(line);
            } else if (lineKey !== null) {
              result.keys.push({ line, from: 0, to: lineKey });
            }
          }
        }
        number = closing;
        owner = table = false;
        continue;
      }
    }

    owner = table = false;
    const range = destination(text);
    if (range) {
      if (visible) {
        result.destinations.push({ line: number, ...range });
      }
      owner = true;
    } else if (text.includes('|') && number < doc.lines && tableDelimiter.test(doc.line(number + 1).text)) {
      number++;
      owner = table = true;
    }
  }

  return result;
}
