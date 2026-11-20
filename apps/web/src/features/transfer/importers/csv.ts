import {
  buildDocument,
  ImportFileError,
  type Converted,
  type ImportItem,
  type Skipped,
} from './document';

const BOM = String.fromCharCode(0xfeff);
const stripBom = (text: string) => (text.startsWith(BOM) ? text.slice(1) : text);

/** Splits RFC 4180 CSV: quoted fields, doubled quotes, and line breaks inside quotes. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const source = stripBom(text);

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new ImportFileError('The CSV has an unclosed quote.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/** Excel in many locales saves with semicolons, and some tools use tabs. */
export function detectDelimiter(text: string): string {
  const header = stripBom(text).split(/\r?\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map(
    (candidate) => [candidate, header.split(candidate).length - 1] as const,
  );
  const best = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : ',';
}

type Field =
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'kind'
  | 'severity'
  | 'dueDate'
  | 'tags'
  | 'epic';

const HEADERS: Record<Field, string[]> = {
  title: ['title', 'name', 'summary', 'task', 'titulo', 'título', 'tarea'],
  description: ['description', 'body', 'details', 'notes', 'descripcion', 'descripción'],
  status: ['status', 'state', 'estado'],
  priority: ['priority', 'prioridad'],
  kind: ['type', 'kind', 'issue type', 'tipo'],
  severity: ['severity', 'severidad'],
  dueDate: ['due', 'due date', 'due_date', 'deadline', 'fecha', 'fecha limite', 'fecha límite'],
  tags: ['tags', 'labels', 'etiquetas'],
  epic: ['epic', 'milestone', 'group', 'sprint', 'hito'],
};

function columnIndex(headers: string[]): Partial<Record<Field, number>> {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const found: Partial<Record<Field, number>> = {};
  for (const [field, names] of Object.entries(HEADERS) as Array<[Field, string[]]>) {
    const position = normalized.findIndex((header) => names.includes(header));
    if (position >= 0) found[field] = position;
  }
  return found;
}

function splitTags(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Converts a CSV exported from a spreadsheet or another tracker into a transfer document. */
export function csvToTransfer(text: string, fileName: string): Converted {
  const rows = parseCsv(text, detectDelimiter(text));
  if (rows.length < 2) {
    throw new ImportFileError('The CSV needs a header row and at least one item.');
  }
  const columns = columnIndex(rows[0]);
  if (columns.title === undefined) {
    throw new ImportFileError(
      'The CSV needs a title column (title, name, summary or task) in its first row.',
    );
  }
  const cell = (row: string[], field: Field) =>
    columns[field] === undefined ? '' : (row[columns[field] as number] ?? '').trim();

  const items: ImportItem[] = [];
  const skipped: Skipped[] = [];
  rows.slice(1).forEach((row, offset) => {
    const title = cell(row, 'title');
    if (!title) {
      skipped.push({ where: `Row ${offset + 2}`, reason: 'No title' });
      return;
    }
    items.push({
      title,
      description: cell(row, 'description'),
      status: cell(row, 'status'),
      priority: cell(row, 'priority'),
      kind: cell(row, 'kind'),
      severity: cell(row, 'severity'),
      dueDate: cell(row, 'dueDate'),
      tags: splitTags(cell(row, 'tags')),
      epic: cell(row, 'epic'),
    });
  });

  const base = fileName.replace(/\.[^.]+$/, '').trim() || 'CSV import';
  return buildDocument('csv', base, `Imported from ${fileName}`, items, skipped);
}
