export class MigrationIdentifierRegistry {
  private readonly identifiers = new Set<string>();

  use(preferred: string | undefined, fallback: string): string {
    const base = this.normalize(preferred ?? fallback);
    let identifier = base;
    let suffix = 2;

    while (this.identifiers.has(identifier)) {
      identifier = `${base}_${suffix}`;
      suffix += 1;
    }

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
