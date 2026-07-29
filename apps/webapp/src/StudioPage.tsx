import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  InvalidAsyncApiSpecification,
  parseAsyncApi,
  type AsyncApiDocument,
} from '@event-specification-gedoens/migration-core';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from '@event-specification-gedoens/ui';
import { Copy, FileText, FileUp, Moon, Radio, Sparkles, Sun, TriangleAlert } from 'lucide-react';

const starterSpec = `asyncapi: 3.0.0
info:
  title: Order Events API
  version: 1.0.0
  description: Events published when an order changes.
channels:
  orderEvents:
    address: orders.events
    messages:
      OrderCreated:
        $ref: '#/components/messages/OrderCreated'
operations:
  publishOrderCreated:
    action: send
    channel:
      $ref: '#/channels/orderEvents'
    messages:
      - $ref: '#/channels/orderEvents/messages/OrderCreated'
components:
  messages:
    OrderCreated:
      name: OrderCreated
      title: Order created
      payload:
        $ref: '#/components/schemas/Order'
  schemas:
    Order:
      type: object
      properties:
        id:
          type: string
        total:
          type: number
      required: [id]`;

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function entries(value: unknown) {
  return Object.entries(asRecord(value) ?? {});
}

function displayValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

interface StudioPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (page: 'migration' | 'studio' | 'docs') => void;
}

export function StudioPage({ darkMode, onToggleDarkMode, onNavigate }: StudioPageProps) {
  const [source, setSource] = useState(starterSpec);
  const [fileName, setFileName] = useState<string>();
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => {
    try {
      return { document: parseAsyncApi(source), error: undefined };
    } catch (error) {
      return {
        document: undefined,
        error:
          error instanceof InvalidAsyncApiSpecification
            ? error.message
            : 'Invalid AsyncAPI specification.',
      };
    }
  }, [source]);
  const document = parsed.document;
  const info = asRecord(document?.info);
  const channels = entries(document?.channels);
  const operations = entries(document?.operations);
  const messages = entries(asRecord(document?.components)?.messages);
  const schemas = entries(asRecord(document?.components)?.schemas);

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSource(await file.text());
      setFileName(file.name);
    } finally {
      event.target.value = '';
    }
  }

  async function copySource() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-6 sm:px-6 lg:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              AsyncAPI Studio
            </p>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Design and preview your event API
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav
            className="flex items-center gap-1 rounded-xl border bg-card/70 p-1 text-sm shadow-sm"
            aria-label="Main navigation"
          >
            <button
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => onNavigate('migration')}
            >
              Migration
            </button>
            <button
              className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
              aria-current="page"
            >
              Studio
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => onNavigate('docs')}
            >
              Docs
            </button>
          </nav>
          <Button
            variant="outline"
            size="icon"
            aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}
            onClick={onToggleDarkMode}
          >
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      <div className="mb-5 flex items-center gap-2 rounded-xl border bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <FileText className="size-4 shrink-0 text-primary" /> Edit YAML or JSON on the left. The
        rendered AsyncAPI document updates instantly on the right.
      </div>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.35fr)]">
        <Card className="flex min-h-[38rem] flex-col overflow-hidden bg-card/90">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Specification</CardTitle>
                <CardDescription>Live YAML / JSON editor</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <FileUp className="size-4" />
                  Upload file
                </Button>
                <Button variant="outline" size="sm" onClick={() => void copySource()}>
                  <Copy className="size-4" />
                  {copied ? 'Copied' : 'Copy'}
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
            {fileName ? (
              <p className="mt-2 text-xs text-muted-foreground">Loaded {fileName}</p>
            ) : null}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
            <label className="sr-only" htmlFor="studio-source">
              AsyncAPI specification
            </label>
            <Textarea
              id="studio-source"
              className="min-h-[31rem] flex-1 resize-none font-mono text-xs leading-5"
              value={source}
              spellCheck={false}
              onChange={(event) => {
                setFileName(undefined);
                setSource(event.target.value);
              }}
            />
            {parsed.error ? (
              <p
                className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {parsed.error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="flex min-h-[38rem] flex-col overflow-hidden bg-card/90">
          <CardHeader className="border-b">
            <CardTitle>Rendered documentation</CardTitle>
            <CardDescription>
              {document
                ? `AsyncAPI ${document.asyncapi} · updates as you type`
                : 'Fix the specification to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto pt-5">
            {document ? (
              <RenderedDocument
                document={document}
                info={info}
                channels={channels}
                operations={operations}
                messages={messages}
                schemas={schemas}
              />
            ) : (
              <div className="flex min-h-[30rem] items-center justify-center text-center text-sm text-muted-foreground">
                <div>
                  <TriangleAlert className="mx-auto mb-3 size-8 text-destructive" />
                  <p>Preview unavailable</p>
                  <p className="mt-1 text-xs">
                    The document must contain a valid AsyncAPI version.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <footer className="mt-5 border-t pt-4 text-center text-xs text-muted-foreground">
        Local-only preview · Your specification never leaves this browser
      </footer>
    </main>
  );
}

function RenderedDocument({
  document,
  info,
  channels,
  operations,
  messages,
  schemas,
}: {
  document: AsyncApiDocument;
  info?: RecordValue;
  channels: [string, unknown][];
  operations: [string, unknown][];
  messages: [string, unknown][];
  schemas: [string, unknown][];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-muted/30 p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Radio className="size-4" /> Event API
        </div>
        <h2 className="text-2xl font-bold">{displayValue(info?.title) ?? 'Untitled AsyncAPI'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {displayValue(info?.description) ?? 'No description provided.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium">
            AsyncAPI {document.asyncapi}
          </span>
          {displayValue(info?.version) ? (
            <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium">
              v{displayValue(info?.version)}
            </span>
          ) : null}
        </div>
      </section>
      <PreviewSection title="Channels" count={channels.length}>
        {channels.length ? (
          channels.map(([name, value]) => {
            const channel = asRecord(value);
            return (
              <div key={name} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm font-semibold text-primary">{name}</code>
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    channel
                  </span>
                </div>
                {displayValue(channel?.address) ? (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {displayValue(channel?.address)}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : (
          <EmptyState label="No channels defined" />
        )}
      </PreviewSection>
      <PreviewSection title="Operations" count={operations.length}>
        {operations.length ? (
          operations.map(([name, value]) => {
            const operation = asRecord(value);
            return (
              <div key={name} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold uppercase text-primary">
                    {displayValue(operation?.action) ?? 'operation'}
                  </span>
                  <code className="text-sm font-semibold">{name}</code>
                </div>
                {operation?.summary ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {displayValue(operation.summary)}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : (
          <EmptyState label="No operations defined" />
        )}
      </PreviewSection>
      <div className="grid gap-5 md:grid-cols-2">
        <PreviewSection title="Messages" count={messages.length}>
          {messages.length ? (
            messages.map(([name, value]) => (
              <div key={name} className="border-b py-2 last:border-0">
                <code className="text-sm text-primary">{name}</code>
                <p className="text-xs text-muted-foreground">
                  {displayValue(asRecord(value)?.title) ?? 'Event message'}
                </p>
              </div>
            ))
          ) : (
            <EmptyState label="No messages defined" />
          )}
        </PreviewSection>
        <PreviewSection title="Schemas" count={schemas.length}>
          {schemas.length ? (
            schemas.map(([name, value]) => (
              <div key={name} className="border-b py-2 last:border-0">
                <code className="text-sm text-primary">{name}</code>
                <p className="text-xs text-muted-foreground">
                  {displayValue(asRecord(value)?.type) ?? 'object'}
                </p>
              </div>
            ))
          ) : (
            <EmptyState label="No schemas defined" />
          )}
        </PreviewSection>
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
function EmptyState({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
      {label}
    </p>
  );
}
