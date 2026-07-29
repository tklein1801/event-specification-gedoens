export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface DocumentationPage {
  slug: string;
  title: string;
  blocks: MarkdownBlock[];
}

function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(`+)(.*?)\1/g, '$2')
    .replace(/[*_~]/g, '')
    .trim();
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cleanInlineMarkdown(cell));
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = (lines[index] ?? '').trim();
    if (!line) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test((lines[index] ?? '').trim())) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', language: fence[1] ?? 'text', code: codeLines.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]?.length ?? 1,
        text: cleanInlineMarkdown(heading[2] ?? ''),
      });
      index += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? '')) {
        items.push(cleanInlineMarkdown((lines[index] ?? '').replace(/^\s*[-*+]\s+/, '')));
        index += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (
      line.includes('|') &&
      index + 1 < lines.length &&
      isTableSeparator((lines[index + 1] ?? '').trim())
    ) {
      const headers = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? '').trim().includes('|')) {
        rows.push(tableCells(lines[index] ?? ''));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      (lines[index] ?? '').trim() &&
      !/^(```|#{1,6}\s|[-*+]\s|\|.*\|)/.test((lines[index] ?? '').trim())
    ) {
      paragraph.push((lines[index] ?? '').trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: cleanInlineMarkdown(paragraph.join(' ')) });
  }

  return blocks;
}

const sources = import.meta.glob('../../../docs/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const documentation: DocumentationPage[] = Object.entries(sources)
  .map(([path, source]) => {
    const slug = path.split('/').pop()?.replace(/\.md$/, '') ?? path;
    const blocks = parseMarkdown(source as string);
    const title = blocks.find((block) => block.type === 'heading')?.text ?? slug;
    return { slug, title, blocks };
  })
  .sort((left, right) => left.title.localeCompare(right.title));
