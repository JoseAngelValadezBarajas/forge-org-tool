import type { ReactNode } from 'react';
import styles from './TableRow.module.css';
export interface TableRowProps {
  cells: readonly ReactNode[];
  header?: boolean;
  warning?: boolean;
}
export function TableRow({ cells, header = false, warning = false }: TableRowProps) {
  return (
    <tr className={[styles.row, warning && styles.warning].filter(Boolean).join(' ')}>
      {cells.map((cell, index) =>
        header ? (
          <th key={index} scope="col" className={styles.cell}>
            {cell}
          </th>
        ) : (
          <td key={index} className={styles.cell}>
            {cell}
          </td>
        ),
      )}
    </tr>
  );
}
