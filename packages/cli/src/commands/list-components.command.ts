import type { ListableComponent } from '@event-specification-gedoens/migration-core';
import { ListComponents, type ComponentOutput } from '../lib/asyncapi/ListComponents';
import { AsyncApiSpecificationReader } from '../lib/asyncapi/AsyncApiSpecificationReader';
import { createAsyncApiCommand } from './asyncapi.command';

interface ListComponentsCommandOptions {
  name: string;
  aliases: [string, ...string[]];
  component: ListableComponent;
  description: string;
}

export function createListComponentsCommand(
  options: ListComponentsCommandOptions,
  reader = new AsyncApiSpecificationReader(),
  output?: ComponentOutput,
) {
  const listComponents = new ListComponents(options.component, reader, output);

  return createAsyncApiCommand({
    name: options.name,
    aliases: options.aliases,
    description: options.description,
    execute: (specification) => listComponents.execute(specification),
  });
}
