import { AsyncApiDocumentNavigator } from './AsyncApiDocumentNavigator';

export class MigrationIdentifierRegistry {
  private readonly identifiers = new Set<string>();

  use(preferred: string | undefined, fallback: string): string {
    const identifier = AsyncApiDocumentNavigator.uniqueName(
      this.normalize(preferred ?? fallback),
      (name) => this.identifiers.has(name),
    );

    this.identifiers.add(identifier);
    return identifier;
  }

  private normalize(value: string): string {
    const identifier = value
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return identifier.length > 0 ? identifier : 'generated';
  }
}
