import { ReaderSymbol } from '@ts-awesome/model-reader'

export class SimpleDate extends Date {
  public static [ReaderSymbol](raw: unknown): SimpleDate {
    const date = raw instanceof Date ? raw :
      typeof raw === 'string' ? new Date(raw.split('T')[0] + 'T00:00:00') :
        typeof raw === 'number' ? new Date(raw) : new Date();
    return new SimpleDate(date.getTime());
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.toISOString().split('T')[0];
  }
}

