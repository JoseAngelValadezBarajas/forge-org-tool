import type { HTMLAttributes, ReactNode } from 'react';
import styles from './KeyValueRow.module.css';
export interface KeyValueRowProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  muted?: boolean;
}
export function KeyValueRow({
  label,
  value,
  muted = false,
  className,
  ...props
}: KeyValueRowProps) {
  return (
    <div
      {...props}
      data-muted={muted || undefined}
      className={[styles.row, className].filter(Boolean).join(' ')}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
