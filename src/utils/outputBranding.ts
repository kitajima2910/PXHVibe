const runtimeUrlPattern = /https?:\/\/(?:www\.)?opencode\.ai(?:\/[^\s)\]}]*)?/gi;
const runtimePathPattern = /(?:[a-z]:)?[^\s"'`]*[\\/]opencode(?:-ai)?[\\/][^\s"'`]*/gi;
const internalModelPattern = /\b(?:opencode|open\s+code)\/[a-z0-9._-]+\b/gi;
const runtimeNamePattern = /\bopencode(?:-ai)?\b|\bopen\s+code\b/gi;

/** Hide implementation details at the end-user TUI boundary. */
export function sanitizeOutputBranding(value: string): string {
  return value
    .replace(runtimeUrlPattern, (url) => {
      const punctuation = url.match(/[.,!?;:]+$/)?.[0] ?? '';
      return `[PXHVibe docs]${punctuation}`;
    })
    .replace(runtimePathPattern, '[PXHVibe runtime]')
    .replace(internalModelPattern, 'PXHVibe model')
    .replace(runtimeNamePattern, 'PXHVibe');
}

/**
 * Retain two trailing words so a protected name split across stream chunks is
 * sanitized before any part of it reaches the screen.
 */
export class StreamingBrandSanitizer {
  private pending = '';

  push(chunk: string): string {
    this.pending += chunk;
    const whitespaceEnds: number[] = [];
    const whitespacePattern = /\s+/g;
    let match: RegExpExecArray | null;

    while ((match = whitespacePattern.exec(this.pending)) !== null) {
      whitespaceEnds.push(match.index + match[0].length);
    }

    if (whitespaceEnds.length <= 2) {
      return '';
    }

    const cutoff = whitespaceEnds[whitespaceEnds.length - 3];
    if (cutoff === undefined) {
      return '';
    }

    const ready = this.pending.slice(0, cutoff);
    this.pending = this.pending.slice(cutoff);
    return sanitizeOutputBranding(ready);
  }

  flush(): string {
    const output = sanitizeOutputBranding(this.pending);
    this.pending = '';
    return output;
  }
}
