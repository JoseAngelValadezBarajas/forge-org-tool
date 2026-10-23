import type { HTMLAttributes } from 'react';
import styles from './Divider.module.css';
export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}
export function Divider({
  orientation = 'horizontal',
  decorative = false,
  className,
  ...props
}: DividerProps) {
  return (
    <div
      {...props}
      role={decorative ? undefined : 'separator'}
      aria-hidden={decorative || undefined}
      aria-orientation={decorative ? undefined : orientation}
      className={[styles.divider, styles[orientation], className].filter(Boolean).join(' ')}
    />
  );
}
