import { command, positional } from '@drizzle-team/brocli';
import { MigrateAsyncApi, type AsyncApiMigrator } from '../../lib/asyncapi/MigrateAsyncApi';

export function createMigrateCommand(migrator: AsyncApiMigrator = new MigrateAsyncApi()) {
  return command({
    name: 'migrate',
    aliases: ['m'],
    desc: 'Migrate AsyncAPI and CloudEvent serialization formats',
    shortDesc: 'Migrate an AsyncAPI specification',
    options: {
      action: positional()
        .enum('to-structured', 'to-unstructured')
        .desc('Migration action')
        .required(),
      specification: positional().desc('Path to a JSON or YAML AsyncAPI specification').required(),
    },
    handler({ action, specification }) {
      migrator.execute(specification, action);
    },
  });
}

export const Migrate = createMigrateCommand();
