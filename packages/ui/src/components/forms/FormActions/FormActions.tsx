import type { HTMLAttributes, ReactNode } from 'react';
import styles from './FormActions.module.css';

export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: 'start' | 'end' | 'between';
}
export function FormActions({ children, align = 'end', className, ...props }: FormActionsProps) {
  return (
    <div
      {...props}
      data-align={align}
      className={[styles.actions, styles[align], className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
