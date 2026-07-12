import type { AsyncApiEvent } from '@event-specification-gedoens/migration-core';
import { log } from '../decorators/log.decorator';
import { logger } from '../logger';
import { AsyncApiSpecificationReader } from './AsyncApiSpecificationReader';
import { EventDirectionFormatter } from './EventDirectionFormatter';

export type EventOutput = (event: AsyncApiEvent) => void;

const directionFormatter = new EventDirectionFormatter();

export class ListEvents {
  constructor(
    private readonly reader = new AsyncApiSpecificationReader(),
    private readonly output: EventOutput = (event) =>
      logger.info('%s: %s', directionFormatter.format(event.direction), event.name),
  ) {}

  @log
  execute(filePath: string): AsyncApiEvent[] {
    const events = this.reader.read(filePath).listEvents();

    events.forEach((event) => this.output(event));

    return events;
  }
}
