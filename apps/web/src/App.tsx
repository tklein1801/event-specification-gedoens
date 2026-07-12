import { useRef, useState, type ChangeEvent } from 'react';
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
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [outputFormat, setOutputFormat] = useState<SpecificationFormat>('yaml');
  const [action, setAction] = useState<MigrationAction>('to-structured');
  const [fileName, setFileName] = useState<string>();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
      const result = migrateAsyncApiText(input, action);
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
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AsyncAPI Migration Studio
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Move CloudEvents between structured and unstructured mode.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Paste YAML or JSON, or choose a local specification. Everything runs in this browser;
            your AsyncAPI document never leaves the device.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border bg-card/70 px-3 py-2 text-xs text-muted-foreground shadow-sm lg:self-auto">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          Local-only processing
        </div>
      </header>

      <section className="mb-5 flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Label htmlFor="migration-action">Migration direction</Label>
          <select
            id="migration-action"
            className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
            value={action}
            onChange={(event) => setAction(event.target.value as MigrationAction)}
          >
            <option value="to-structured">AsyncAPI 2.x → 3.x · structured</option>
            <option value="to-unstructured">AsyncAPI 3.x → 2.x · unstructured</option>
          </select>
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

      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2">
        <Card className="flex min-h-[34rem] flex-col overflow-hidden bg-card/90">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Source specification</CardTitle>
                <CardDescription>AsyncAPI YAML or JSON</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <FileUp className="size-4" aria-hidden="true" />
                Choose file
              </Button>
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
              className="min-h-[26rem] flex-1 resize-none leading-6"
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

        <Card className="flex min-h-[34rem] flex-col overflow-hidden bg-card/90">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Migrated specification</CardTitle>
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
            <Label className="sr-only" htmlFor="migration-output">
              Migrated AsyncAPI result
            </Label>
            <Textarea
              id="migration-output"
              className="min-h-[26rem] flex-1 resize-none bg-muted/40 leading-6"
              value={output}
              readOnly
              spellCheck={false}
              placeholder="Your migrated specification will appear here."
            />
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          'mt-5 min-h-11 rounded-xl border px-4 py-3 text-sm',
          status.kind === 'error' && 'border-destructive/40 bg-destructive/5 text-destructive',
          status.kind === 'success' && 'border-primary/30 bg-primary/5 text-primary',
          (status.kind === 'idle' || status.kind === 'loading') &&
            'bg-card/70 text-muted-foreground',
        )}
        role={status.kind === 'error' ? 'alert' : 'status'}
      >
        {status.kind === 'idle' && 'Ready for a local migration.'}
        {status.kind === 'loading' && 'Validating and transforming the specification…'}
        {(status.kind === 'success' || status.kind === 'error') && status.message}
      </div>
    </main>
  );
}
