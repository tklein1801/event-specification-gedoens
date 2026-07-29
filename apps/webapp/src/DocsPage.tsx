import { BookOpen, Github, Moon, Sun } from 'lucide-react';
import type { ElementType } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@event-specification-gedoens/ui';
import { documentation, type MarkdownBlock } from './docs';

interface DocsPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (page: 'migration' | 'studio' | 'docs') => void;
}

function Block({ block }: { block: MarkdownBlock }) {
  if (block.type === 'heading') {
    const Heading = `h${Math.min(block.level, 6)}` as ElementType;
    return <Heading className="mt-8 text-xl font-semibold first:mt-0">{block.text}</Heading>;
  }
  if (block.type === 'paragraph')
    return <p className="mt-4 leading-7 text-muted-foreground">{block.text}</p>;
  if (block.type === 'list') {
    return (
      <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-muted-foreground">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === 'code') {
    return (
      <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/60 p-4 text-sm leading-6">
        <code data-language={block.language}>{block.code}</code>
      </pre>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60">
          <tr>
            {block.headers.map((header) => (
              <th className="px-4 py-3 font-semibold" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr className="border-t" key={`${rowIndex}-${row.join('-')}`}>
              {row.map((cell, cellIndex) => (
                <td className="px-4 py-3 text-muted-foreground" key={`${cellIndex}-${cell}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsPage({ darkMode, onToggleDarkMode, onNavigate }: DocsPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <nav
            className="mb-5 flex w-fit items-center gap-1 rounded-xl border bg-card/70 p-1 text-sm shadow-sm"
            aria-label="Main navigation"
          >
            <button
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => onNavigate('migration')}
            >
              Migration
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => onNavigate('studio')}
            >
              Studio
            </button>
            <button
              className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
              aria-current="page"
            >
              Docs
            </button>
          </nav>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Documentation
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AsyncAPI Migration Studio Docs
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Project documentation, embedded at build time from the repository’s <code>docs/</code>{' '}
            folder.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}
          title={darkMode ? 'Use light mode' : 'Use dark mode'}
          onClick={onToggleDarkMode}
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="h-fit rounded-2xl border bg-card/80 p-4 shadow-sm lg:sticky lg:top-6">
          <h2 className="font-semibold">Documents</h2>
          <ul className="mt-3 space-y-1">
            {documentation.map((doc) => (
              <li key={doc.slug}>
                <a
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  href={`#docs-${doc.slug}`}
                >
                  {doc.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        <section className="space-y-6" aria-label="Documentation">
          {documentation.map((doc) => (
            <Card id={`docs-${doc.slug}`} className="scroll-mt-6 bg-card/90" key={doc.slug}>
              <CardHeader className="border-b">
                <CardTitle>{doc.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {doc.blocks.slice(1).map((block, index) => (
                  <Block block={block} key={`${doc.slug}-${index}`} />
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
      <footer className="mt-8 flex items-center justify-between border-t pt-5 text-xs text-muted-foreground">
        <span>Documentation · static build output</span>
        <a
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-medium hover:bg-accent hover:text-accent-foreground"
          href="https://github.com/tklein1801/event-specification-gedoens"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="size-4" aria-hidden="true" />
          View on GitHub
        </a>
      </footer>
    </main>
  );
}
