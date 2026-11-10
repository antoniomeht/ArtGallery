/**
 * HTML of Word files waiting for the editor of their new document. The
 * editor parses it with its own rules, so only what it supports is kept,
 * and the result is saved like any other change.
 */
const pending = new Map<string, string>();

export function setPendingImport(documentId: string, html: string): void {
  pending.set(documentId, html);
}

export function takePendingImport(documentId: string): string | null {
  const html = pending.get(documentId) ?? null;
  pending.delete(documentId);
  return html;
}
