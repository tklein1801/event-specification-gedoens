import { command, positional } from '@drizzle-team/brocli';

interface AsyncApiCommandOptions<Result> {
  name: string;
  aliases: [string, ...string[]];
  description: string;
  execute: (filePath: string) => Result;
}

export function createAsyncApiCommand<Result>(options: AsyncApiCommandOptions<Result>) {
  return command({
    name: options.name,
    aliases: options.aliases,
    desc: options.description,
    shortDesc: options.description,
    options: {
      specification: positional().desc('Path to a JSON AsyncAPI specification').required(),
    },
    handler({ specification }) {
      return options.execute(specification);
    },
  });
}
