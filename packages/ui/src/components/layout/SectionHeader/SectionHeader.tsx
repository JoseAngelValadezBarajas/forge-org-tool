import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';
export interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  counter?: ReactNode;
  headingLevel?: 2 | 3;
}
export function SectionHeader({
  title,
  eyebrow,
  actions,
  counter,
  headingLevel = 2,
}: SectionHeaderProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <Heading className={styles.title}>{title}</Heading>
        {counter != null && <span className={styles.counter}>{counter}</span>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
