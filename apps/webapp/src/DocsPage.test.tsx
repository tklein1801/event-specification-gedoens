import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { documentation, parseMarkdown } from './docs';

afterEach(cleanup);

describe('documentation embedding', () => {
  it('parses headings, lists, tables, paragraphs, and fenced code', () => {
    const blocks = parseMarkdown(
      `# Guide\n\nText **here**.\n\n- one\n- two\n\n1. first\n2. second\n\n| Name | Value |\n| --- | --- |\n| a | b |\n\n\`\`\`ts\nconst answer = 42;\n\`\`\``,
    );
    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'Guide' },
      { type: 'paragraph', text: 'Text here.' },
      { type: 'list', ordered: false, items: ['one', 'two'] },
      { type: 'list', ordered: true, items: ['first', 'second'] },
      { type: 'table', headers: ['Name', 'Value'], rows: [['a', 'b']] },
      { type: 'code', language: 'ts', code: 'const answer = 42;' },
    ]);
  });

  it('renders unordered and ordered lists with the matching HTML elements', () => {
    window.location.hash = '#docs';
    render(<App />);
    expect(document.querySelectorAll('ul').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('ol').length).toBeGreaterThan(0);
  });

  it('statically embeds every Markdown document from docs', () => {
    expect(documentation.map((doc) => doc.slug)).toEqual([
      'migrate-command',
      'structured-vs-unstructured',
      'versioning',
    ]);
    expect(documentation.every((doc) => doc.blocks.length > 1)).toBe(true);
  });

  it('renders the embedded documents on the Docs page', () => {
    window.location.hash = '#docs';
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'AsyncAPI Migration Studio Docs' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Versioning and releases' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Migration command reference' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/static build output/)).toBeInTheDocument();
  });
});
