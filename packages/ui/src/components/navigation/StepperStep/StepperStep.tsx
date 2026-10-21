import type { LiHTMLAttributes, ReactNode } from 'react';
import styles from './StepperStep.module.css';
export interface StepperStepProps extends Omit<LiHTMLAttributes<HTMLLIElement>, 'children'> {
  label: string;
  state?: 'complete' | 'current' | 'upcoming';
  description?: ReactNode;
  index?: number;
}
export function StepperStep({
  label,
  state = 'upcoming',
  description,
  index,
  className,
  ...props
}: StepperStepProps) {
  return (
    <li
      {...props}
      aria-current={state === 'current' ? 'step' : undefined}
      data-state={state}
      className={[styles.step, styles[state], className].filter(Boolean).join(' ')}
    >
      <span className={styles.marker} aria-hidden="true">
        {state === 'complete' ? '✓' : (index ?? '')}
      </span>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </li>
  );
}
