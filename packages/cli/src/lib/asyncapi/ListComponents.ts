import type { ListableComponent } from '@event-specification-gedoens/migration-core';
import { log } from '../decorators/log.decorator';
import { logger } from '../logger';
import { AsyncApiSpecificationReader } from './AsyncApiSpecificationReader';

export type ComponentOutput = (name: string) => void;

export class ListComponents {
  constructor(
    private readonly component: ListableComponent,
    private readonly reader = new AsyncApiSpecificationReader(),
    private readonly output: ComponentOutput = (name) => logger.info(name),
  ) {}

  @log
  execute(filePath: string): string[] {
    const names = this.reader.read(filePath).list(this.component);

    names.forEach((name) => this.output(name));

    return names;
  }
}
