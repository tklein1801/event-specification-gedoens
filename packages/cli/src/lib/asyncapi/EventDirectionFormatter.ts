import chalk from 'chalk';
import type { EventDirection } from '@event-specification-gedoens/migration-core';

type TextStyle = (text: string) => string;
type EventDirectionStyles = Record<EventDirection, TextStyle>;

const directionLabels: Record<EventDirection, string> = {
  published: 'PUB',
  consumed: 'SUB',
};

export class EventDirectionFormatter {
  constructor(
    private readonly styles: EventDirectionStyles = {
      published: chalk.bold.green,
      consumed: chalk.bold.yellow,
    },
  ) {}

  format(direction: EventDirection): string {
    return this.styles[direction](directionLabels[direction]);
  }
}
