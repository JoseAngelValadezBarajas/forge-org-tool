import { csvToTransfer } from './csv';
import { ImportFileError, type Converted } from './document';
import { githubIssuesToTransfer, looksLikeGithubIssues } from './githubIssues';

export { ImportFileError } from './document';
export type { Converted, ConversionSummary } from './document';

/**
 * Converts a file from another tool into a transfer document. Returns `null` for a file that is
 * already in a FORGE format (a transfer JSON), which the caller keeps as it is.
 */
export function convertForeignSource(fileName: string, text: string): Converted | null {
  const name = fileName.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv')) return csvToTransfer(text, fileName);
  if (!name.endsWith('.json')) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null; // Not valid JSON: let the normal flow report it.
  }
  if (looksLikeGithubIssues(parsed)) return githubIssuesToTransfer(parsed);
  if (Array.isArray(parsed)) {
    throw new ImportFileError(
      'This JSON is a list but not GitHub issues. Export them with: gh issue list --state all --limit 1000 --json number,title,body,state,labels,milestone,url',
    );
  }
  return null;
}
