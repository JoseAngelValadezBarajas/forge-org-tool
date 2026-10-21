import type { ReactNode } from 'react';
import styles from './RecordRow.module.css';
export interface RecordRowProps {
  title: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
  selected?: boolean;
  readOnly?: boolean;
  className?: string;
}
export function RecordRow({
  title,
  metadata,
  status,
  selected = false,
  readOnly = false,
  className,
}: RecordRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      data-read-only={readOnly || undefined}
      className={[styles.row, className].filter(Boolean).join(' ')}
    >
      <th scope="row" className={styles.primary}>
        <span>{title}</span>
        {metadata && <small>{metadata}</small>}
      </th>
      <td className={styles.status}>{status}</td>
    </tr>
  );
}
