import { useMemo, useState, type ReactNode } from 'react';
import {
  AsyncApiSpecification,
  parseAsyncApi,
  type AsyncApiDocument,
  type AsyncApiEvent,
} from '@event-specification-gedoens/migration-core';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@event-specification-gedoens/ui';
import {
  Boxes,
  ChevronDown,
  Clipboard,
  FileCode2,
  Info,
  MessageSquareText,
  Radio,
  X,
} from 'lucide-react';

type InfoTarget = 'source' | 'target';
type InfoSectionId = 'events' | 'messages' | 'schemas' | 'messageTraits';

interface SpecificationInfoProps {
  source: string;
  target: string;
  onCopied: (label: string) => void;
  onCopyError: () => void;
}

interface CopyableValue {
  name: string;
  value: unknown;
}

interface SpecificationSummary {
  version: string;
  events: Array<AsyncApiEvent & { value: unknown }>;
  messages: CopyableValue[];
  schemas: CopyableValue[];
  messageTraits: CopyableValue[];
}

type InspectionResult =
  | { kind: 'empty' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; summary: SpecificationSummary };

function inspectSpecification(content: string): InspectionResult {
  if (!content.trim()) return { kind: 'empty' };

  try {
    const document = parseAsyncApi(content);
    const specification = new AsyncApiSpecification(document);
    const componentValues = (component: 'messages' | 'schemas' | 'messageTraits') =>
      specification.list(component).map((name) => ({
        name,
        value: document.components?.[component]?.[name],
      }));
    const messages = componentValues('messages');

    return {
      kind: 'ready',
      summary: {
        version: document.asyncapi,
        events: specification.listEvents().map((event) => ({
          ...event,
          value: findEventValue(document, messages, event),
        })),
        messages,
        schemas: componentValues('schemas'),
        messageTraits: componentValues('messageTraits'),
      },
    };
  } catch (error) {
    return {
      kind: 'invalid',
      message: error instanceof Error ? error.message : 'The specification could not be inspected.',
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findEventValue(
  document: AsyncApiDocument,
  messages: CopyableValue[],
  event: AsyncApiEvent,
): unknown {
  const component = messages.find(
    (message) =>
      message.name === event.name || (isRecord(message.value) && message.value.name === event.name),
  );
  if (component) return resolveReferencesDeep(document, component.value);

  const inlineMessage = findNamedObject(document, event.name);
  if (inlineMessage) return resolveReferencesDeep(document, inlineMessage);

  const channel = document.channels?.[event.name];
  if (isRecord(channel)) {
    const operationName = event.direction === 'published' ? 'subscribe' : 'publish';
    const operation = channel[operationName];
    if (isRecord(operation) && operation.message !== undefined) {
      return resolveReferencesDeep(document, operation.message);
    }
  }

  return event;
}

function findNamedObject(value: unknown, name: string, visited = new Set<object>()): unknown {
  if (Array.isArray(value)) {
    if (visited.has(value)) return undefined;
    visited.add(value);
    for (const item of value) {
      const match = findNamedObject(item, name, visited);
      if (match !== undefined) return match;
    }
    return undefined;
  }

  if (!isRecord(value) || visited.has(value)) return undefined;
  visited.add(value);
  if (value.name === name) return value;

  for (const child of Object.values(value)) {
    const match = findNamedObject(child, name, visited);
    if (match !== undefined) return match;
  }
  return undefined;
}

function resolveReference(document: AsyncApiDocument, value: unknown): unknown {
  if (!isRecord(value) || typeof value.$ref !== 'string' || !value.$ref.startsWith('#/')) {
    return value;
  }

  return value.$ref
    .slice(2)
    .split('/')
    .map((segment) => decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>(
      (current, segment) => (isRecord(current) ? current[segment] : undefined),
      document,
    );
}

function resolveReferencesDeep(
  document: AsyncApiDocument,
  value: unknown,
  resolving = new Set<string>(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveReferencesDeep(document, item, resolving));
  }
  if (!isRecord(value)) return value;

  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
    if (resolving.has(value.$ref)) return value;

    const resolved = resolveReference(document, value);
    if (resolved === undefined) return value;

    const nextResolving = new Set(resolving).add(value.$ref);
    const resolvedValue = resolveReferencesDeep(document, resolved, nextResolving);
    const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref'));
    const resolvedSiblings = resolveReferencesDeep(document, siblings, nextResolving);

    return isRecord(resolvedValue) && isRecord(resolvedSiblings)
      ? { ...resolvedValue, ...resolvedSiblings }
      : resolvedValue;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      resolveReferencesDeep(document, child, resolving),
    ]),
  );
}

function InfoSection({
  title,
  count,
  icon,
  children,
  open,
  onToggle,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border bg-background/60">
      <button
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="text-primary">{icon}</span>
        <span className="flex-1">{title}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
        <ChevronDown
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="border-t px-3 py-3">{children}</div> : null}
    </div>
  );
}

function CopyableValueList({
  values,
  emptyLabel,
  valueType,
  onCopy,
}: {
  values: CopyableValue[];
  emptyLabel: string;
  valueType: string;
  onCopy: (value: unknown, label: string) => void;
}) {
  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {values.map(({ name, value }) => (
        <li key={name}>
          <button
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-2 text-left font-mono text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            aria-label={`Copy ${valueType} ${name}`}
            title={`Copy ${valueType} definition`}
            onClick={() => onCopy(value, `${valueType} ${name}`)}
          >
            <span className="min-w-0 flex-1 break-all">{name}</span>
            <Clipboard className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function EventList({
  events,
  onCopy,
}: {
  events: Array<AsyncApiEvent & { value: unknown }>;
  onCopy: (value: unknown, label: string) => void;
}) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No operations with events found.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {events.map((event) => {
        const operation = event.direction === 'published' ? 'PUB' : 'SUB';

        return (
          <li key={`${event.direction}-${event.name}`}>
            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              aria-label={`Copy event ${event.name}`}
              title="Copy event definition"
              onClick={() => onCopy(event.value, `Event ${event.name}`)}
            >
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-[0.65rem] font-bold',
                  event.direction === 'published'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                {operation}
              </span>
              <span className="min-w-0 flex-1 break-all font-mono">{event.name}</span>
              <Clipboard className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SpecificationInfo({
  source,
  target,
  onCopied,
  onCopyError,
}: SpecificationInfoProps) {
  const [open, setOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState<InfoTarget>('source');
  const [openSection, setOpenSection] = useState<InfoSectionId | null>('events');
  const content = activeTarget === 'source' ? source : target;
  const inspection = useMemo(() => inspectSpecification(content), [content]);

  async function copyValue(value: unknown, label: string) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      await navigator.clipboard.writeText(serialized ?? '');
      onCopied(label);
    } catch {
      onCopyError();
    }
  }

  if (!open) {
    return (
      <Button
        className="fixed bottom-5 right-5 z-30 size-12 cursor-pointer rounded-full shadow-lg sm:bottom-6 sm:right-6"
        size="icon"
        aria-label="Open specification info"
        title="Specification info"
        onClick={() => setOpen(true)}
      >
        <Info className="size-5" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Card
      className="fixed bottom-4 right-4 z-30 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden bg-card/95 shadow-2xl backdrop-blur sm:bottom-6 sm:right-6"
      aria-label="Specification information"
    >
      <CardHeader className="border-b pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Specification info</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Inspect components and event operations.
            </p>
          </div>
          <Button
            className="size-9 cursor-pointer"
            variant="ghost"
            size="icon"
            aria-label="Close specification info"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div
          className="mt-3 grid grid-cols-2 rounded-xl bg-muted p-1"
          role="tablist"
          aria-label="Specification target"
        >
          {(['source', 'target'] as const).map((tab) => (
            <button
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeTarget === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              type="button"
              role="tab"
              aria-selected={activeTarget === tab}
              key={tab}
              onClick={() => setActiveTarget(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto pt-4">
        {inspection.kind === 'empty' ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center">
            <FileCode2 className="mx-auto mb-3 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              {activeTarget === 'source'
                ? 'No source specification yet'
                : 'No target available yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTarget === 'source'
                ? 'Paste or upload an AsyncAPI specification.'
                : 'Run a migration to inspect the target.'}
            </p>
          </div>
        ) : null}

        {inspection.kind === 'invalid' ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {inspection.message}
          </div>
        ) : null}

        {inspection.kind === 'ready' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>AsyncAPI version</span>
              <span className="rounded-md bg-muted px-2 py-1 font-mono font-semibold text-foreground">
                {inspection.summary.version}
              </span>
            </div>

            <InfoSection
              title="Events"
              count={inspection.summary.events.length}
              icon={<Radio className="size-4" />}
              open={openSection === 'events'}
              onToggle={() => setOpenSection((current) => (current === 'events' ? null : 'events'))}
            >
              <EventList
                events={inspection.summary.events}
                onCopy={(value, label) => void copyValue(value, label)}
              />
            </InfoSection>
            <InfoSection
              title="Messages"
              count={inspection.summary.messages.length}
              icon={<MessageSquareText className="size-4" />}
              open={openSection === 'messages'}
              onToggle={() =>
                setOpenSection((current) => (current === 'messages' ? null : 'messages'))
              }
            >
              <CopyableValueList
                values={inspection.summary.messages}
                valueType="Message"
                emptyLabel="No messages found."
                onCopy={(value, label) => void copyValue(value, label)}
              />
            </InfoSection>
            <InfoSection
              title="Schemas"
              count={inspection.summary.schemas.length}
              icon={<Boxes className="size-4" />}
              open={openSection === 'schemas'}
              onToggle={() =>
                setOpenSection((current) => (current === 'schemas' ? null : 'schemas'))
              }
            >
              <CopyableValueList
                values={inspection.summary.schemas}
                valueType="Schema"
                emptyLabel="No schemas found."
                onCopy={(value, label) => void copyValue(value, label)}
              />
            </InfoSection>
            <InfoSection
              title="MessageTraits"
              count={inspection.summary.messageTraits.length}
              icon={<FileCode2 className="size-4" />}
              open={openSection === 'messageTraits'}
              onToggle={() =>
                setOpenSection((current) => (current === 'messageTraits' ? null : 'messageTraits'))
              }
            >
              <CopyableValueList
                values={inspection.summary.messageTraits}
                valueType="Message trait"
                emptyLabel="No message traits found."
                onCopy={(value, label) => void copyValue(value, label)}
              />
            </InfoSection>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
