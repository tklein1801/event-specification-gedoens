import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  InvalidAsyncApiSpecification,
  migrateAsyncApiText,
  type MigrationAction,
  type SpecificationFormat,
} from '@event-specification-gedoens/migration-core';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
  cn,
} from '@event-specification-gedoens/ui';
import {
  Check,
  Clipboard,
  Download,
  FileUp,
  Github,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import packageJson from '../package.json';
import { SpecificationInfo } from './SpecificationInfo';
import { StudioPage } from './StudioPage';
import { DocsPage } from './DocsPage';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [outputFormat, setOutputFormat] = useState<SpecificationFormat>('yaml');
  const [migrationAction, setMigrationAction] = useState<MigrationAction>('to-structured');
  const [fileName, setFileName] = useState<string>();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const [maximizedEditor, setMaximizedEditor] = useState<'source' | 'output' | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem('esg-theme');
    if (storedTheme) return storedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [page, setPage] = useState<'migration' | 'studio' | 'docs'>(() => {
    if (window.location.hash === '#studio') return 'studio';
    if (window.location.hash === '#docs' || window.location.hash.startsWith('#docs-'))
      return 'docs';
    return 'migration';
  });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#studio') setPage('studio');
      else if (window.location.hash === '#docs' || window.location.hash.startsWith('#docs-'))
        setPage('docs');
      else setPage('migration');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(nextPage: 'migration' | 'studio' | 'docs') {
    window.location.hash = nextPage === 'migration' ? '' : nextPage;
    setPage(nextPage);
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    localStorage.setItem('esg-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (status.kind !== 'success' && status.kind !== 'error') return;

    const timeout = window.setTimeout(() => setStatus({ kind: 'idle' }), 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (!maximizedEditor) return;

    const previousOverflow = document.body.style.overflow;
    const restoreEditor = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMaximizedEditor(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', restoreEditor);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', restoreEditor);
    };
  }, [maximizedEditor]);

  function updateInput(value: string) {
    setInput(value);
    setOutput('');
    setStatus({ kind: 'idle' });
    setCopied(false);
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      updateInput(await file.text());
      setFileName(file.name);
      setStatus({ kind: 'success', message: `${file.name} was uploaded successfully.` });
    } catch {
      setStatus({ kind: 'error', message: `Could not read ${file.name}.` });
    } finally {
      event.target.value = '';
    }
  }

  async function migrate() {
    setStatus({ kind: 'loading' });
    setOutput('');
    setCopied(false);

    await Promise.resolve();

    try {
      const result = migrateAsyncApiText(input, migrationAction);
      setOutput(result.content);
      setOutputFormat(result.format);
      setStatus({
        kind: 'success',
        message: `Migration complete · AsyncAPI ${result.document.asyncapi}`,
      });
    } catch (error) {
      const message =
        error instanceof InvalidAsyncApiSpecification
          ? error.message
          : 'The specification could not be migrated.';
      setStatus({ kind: 'error', message });
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setStatus({ kind: 'success', message: 'Migrated specification copied to the clipboard.' });
    } catch {
      setStatus({ kind: 'error', message: 'Clipboard access is unavailable in this browser.' });
    }
  }

  function downloadResult() {
    const extension = outputFormat === 'json' ? 'json' : 'yaml';
    const baseName = (fileName ?? 'asyncapi').replace(/\.(json|ya?ml)$/i, '');
    const url = URL.createObjectURL(
      new Blob([output], {
        type: outputFormat === 'json' ? 'application/json' : 'application/yaml',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.migrated.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: 'success', message: `${link.download} download started.` });
  }

  function showCopyToast(label: string) {
    setStatus({ kind: 'success', message: `${label} copied to the clipboard.` });
  }

  if (page === 'studio') {
    return (
      <StudioPage
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onNavigate={navigate}
      />
    );
  }

  if (page === 'docs') {
    return (
      <DocsPage
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onNavigate={navigate}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <nav
            className="mb-5 flex w-fit items-center gap-1 rounded-xl border bg-card/70 p-1 text-sm shadow-sm"
            aria-label="Main navigation"
          >
            <button
              className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
              aria-current="page"
              onClick={() => navigate('migration')}
            >
              Migration
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => navigate('studio')}
            >
              Studio
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => navigate('docs')}
            >
              Docs
            </button>
          </nav>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AsyncAPI Migration Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Migrate CloudEvents between structured and unstructured mode.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Paste YAML or JSON, or choose a local specification. Everything runs in this browser;
            your AsyncAPI document never leaves the device.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border bg-card/70 px-3 py-2 text-xs text-muted-foreground shadow-sm">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Local-only processing
          </div>
        </div>
        <Button
          className="self-start lg:self-auto"
          variant="outline"
          size="icon"
          aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}
          title={darkMode ? 'Use light mode' : 'Use dark mode'}
          onClick={() => setDarkMode((current) => !current)}
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      <section className="mb-5 flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Label htmlFor="migration-action">Migration direction</Label>
          <select
            id="migration-action"
            className="mt-2 h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground shadow-sm disabled:cursor-not-allowed"
            value={migrationAction}
            aria-describedby="migration-action-note"
            onChange={(event) => setMigrationAction(event.target.value as MigrationAction)}
          >
            <option value="to-structured">AsyncAPI 2.x → 3.x · structured</option>
            <option value="to-unstructured">AsyncAPI 3.x → 2.x · unstructured</option>
          </select>
          <p id="migration-action-note" className="mt-2 text-xs text-muted-foreground">
            Choose the direction that matches the input specification.
          </p>
        </div>
        <Button size="lg" onClick={() => void migrate()} disabled={status.kind === 'loading'}>
          {status.kind === 'loading' ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {status.kind === 'loading' ? 'Migrating…' : 'Migrate specification'}
        </Button>
      </section>

      {maximizedEditor ? (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          data-testid="editor-dialog-backdrop"
          aria-hidden="true"
          onClick={() => setMaximizedEditor(null)}
        />
      ) : null}

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2">
        <Card
          className={cn(
            'flex flex-col overflow-hidden bg-card/90',
            maximizedEditor === 'source'
              ? 'fixed inset-3 z-50 min-h-0 shadow-2xl ring-1 ring-border sm:inset-6 lg:inset-10'
              : 'min-h-[34rem]',
            maximizedEditor === 'output' && 'hidden',
          )}
          role={maximizedEditor === 'source' ? 'dialog' : undefined}
          aria-modal={maximizedEditor === 'source' ? true : undefined}
          aria-labelledby={maximizedEditor === 'source' ? 'source-editor-title' : undefined}
        >
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle id="source-editor-title">Source specification</CardTitle>
                <CardDescription>AsyncAPI YAML or JSON</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <FileUp className="size-4" aria-hidden="true" />
                  Choose file
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label={
                    maximizedEditor === 'source'
                      ? 'Restore source editor'
                      : 'Maximize source editor'
                  }
                  title={maximizedEditor === 'source' ? 'Restore editor' : 'Maximize editor'}
                  onClick={() =>
                    setMaximizedEditor((current) => (current === 'source' ? null : 'source'))
                  }
                >
                  {maximizedEditor === 'source' ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </Button>
              </div>
              <input
                ref={fileInput}
                className="hidden"
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
                aria-label="Upload AsyncAPI file"
                onChange={(event) => void uploadFile(event)}
              />
            </div>
            {fileName ? <p className="text-xs text-muted-foreground">Loaded {fileName}</p> : null}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
            <Label className="sr-only" htmlFor="source-input">
              AsyncAPI source
            </Label>
            <Textarea
              id="source-input"
              className={cn(
                'flex-1 resize-none leading-6',
                maximizedEditor === 'source' ? 'min-h-0' : 'min-h-[26rem]',
              )}
              value={input}
              spellCheck={false}
              placeholder={'asyncapi: 2.6.0\ninfo:\n  title: Order Events\n  version: 1.0.0'}
              onChange={(event) => {
                setFileName(undefined);
                updateInput(event.target.value);
              }}
            />
          </CardContent>
        </Card>

        <Card
          className={cn(
            'flex flex-col overflow-hidden bg-card/90',
            maximizedEditor === 'output'
              ? 'fixed inset-3 z-50 min-h-0 shadow-2xl ring-1 ring-border sm:inset-6 lg:inset-10'
              : 'min-h-[34rem]',
            maximizedEditor === 'source' && 'hidden',
          )}
          role={maximizedEditor === 'output' ? 'dialog' : undefined}
          aria-modal={maximizedEditor === 'output' ? true : undefined}
          aria-labelledby={maximizedEditor === 'output' ? 'output-editor-title' : undefined}
        >
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle id="output-editor-title">Migrated specification</CardTitle>
                <CardDescription>Formatted in the source format</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyResult()}
                  disabled={!output}
                >
                  {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadResult} disabled={!output}>
                  <Download className="size-4" aria-hidden="true" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label={
                    maximizedEditor === 'output'
                      ? 'Restore result editor'
                      : 'Maximize result editor'
                  }
                  title={maximizedEditor === 'output' ? 'Restore editor' : 'Maximize editor'}
                  onClick={() =>
                    setMaximizedEditor((current) => (current === 'output' ? null : 'output'))
                  }
                >
                  {maximizedEditor === 'output' ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
            <Label className="sr-only" htmlFor="migration-output">
              Migrated AsyncAPI result
            </Label>
            <Textarea
              id="migration-output"
              className={cn(
                'flex-1 resize-none bg-muted/40 leading-6',
                maximizedEditor === 'output' ? 'min-h-0' : 'min-h-[26rem]',
              )}
              value={output}
              readOnly
              spellCheck={false}
              placeholder="Your migrated specification will appear here."
            />
          </CardContent>
        </Card>
      </div>

      {status.kind !== 'idle' ? (
        <div
          className={cn(
            'fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-xl border bg-card/95 px-4 py-3 text-sm shadow-xl backdrop-blur sm:right-6 sm:top-6',
            status.kind === 'error' && 'border-destructive/40 text-destructive',
            status.kind === 'success' && 'border-primary/30 text-foreground',
            status.kind === 'loading' && 'text-muted-foreground',
          )}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.kind === 'loading' ? (
            <LoaderCircle
              className="mt-0.5 size-4 shrink-0 animate-spin text-primary"
              aria-hidden="true"
            />
          ) : status.kind === 'success' ? (
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          ) : null}
          <span className="min-w-0 flex-1">
            {status.kind === 'loading' && 'Validating and transforming the specification…'}
            {(status.kind === 'success' || status.kind === 'error') && status.message}
          </span>
          {status.kind !== 'loading' ? (
            <button
              className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setStatus({ kind: 'idle' })}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      <footer className="mt-5 flex flex-col items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground sm:flex-row">
        <span>AsyncAPI Migration Studio · v{packageJson.version}</span>
        <a
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="https://github.com/tklein1801/event-specification-gedoens"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="size-4" aria-hidden="true" />
          View on GitHub
        </a>
      </footer>

      <SpecificationInfo
        source={input}
        target={output}
        onCopied={showCopyToast}
        onCopyError={() =>
          setStatus({
            kind: 'error',
            message: 'Clipboard access is unavailable in this browser.',
          })
        }
      />
    </main>
  );
}
