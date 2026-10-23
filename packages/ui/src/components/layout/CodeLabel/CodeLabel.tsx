import type { HTMLAttributes, ReactNode } from 'react';
import styles from './CodeLabel.module.css';
export interface CodeLabelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}
export function CodeLabel({ children, className, ...props }: CodeLabelProps) {
  return (
    <code {...props} className={[styles.label, className].filter(Boolean).join(' ')}>
      {children}
    </code>
  );
}
