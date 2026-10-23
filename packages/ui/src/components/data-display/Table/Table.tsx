import type { ReactNode, TableHTMLAttributes } from 'react';
import styles from './Table.module.css';
export interface TableColumn<Row> {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
}
export interface TableProps<Row> extends Omit<TableHTMLAttributes<HTMLTableElement>, 'children'> {
  caption: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey?: (row: Row, index: number) => string | number;
  emptyMessage?: ReactNode;
}
export function Table<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No records',
  className,
  ...props
}: TableProps<Row>) {
  return (
    <div className={styles.scroll}>
      <table {...props} className={[styles.table, className].filter(Boolean).join(' ')}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={getRowKey?.(row, index) ?? index}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
