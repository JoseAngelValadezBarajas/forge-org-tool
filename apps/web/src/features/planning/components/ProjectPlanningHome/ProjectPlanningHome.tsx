import type { ReactNode } from 'react';
import styles from './ProjectPlanningHome.module.css';

type ProjectPlanningHomeProps = { children: ReactNode };

export function ProjectPlanningHome({ children }: ProjectPlanningHomeProps) {
  return (
    <section className={styles.home} aria-label="Project planning">
      {children}
    </section>
  );
}
