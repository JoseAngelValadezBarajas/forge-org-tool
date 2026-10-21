import type { DetailsHTMLAttributes, ReactNode } from 'react';
import styles from './Popover.module.css';
export interface PopoverProps extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> {
  trigger: ReactNode;
  children: ReactNode;
}
export function Popover({ trigger, children, className, ...props }: PopoverProps) {
  return (
    <details {...props} className={[styles.popover, className].filter(Boolean).join(' ')}>
      <summary>{trigger}</summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
