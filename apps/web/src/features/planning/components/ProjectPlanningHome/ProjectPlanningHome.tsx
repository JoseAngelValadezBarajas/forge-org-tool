import type { ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './ProjectPlanningHome.module.css';

export type ProjectPlanningHomeState = 'Default' | 'Empty' | 'Archived';

export type ProjectPlanningHomeProps = {
  children?: ReactNode;
  /** Explicit visual specimen state; omitted state preserves the legacy page wrapper. */
  state?: ProjectPlanningHomeState;
  title?: string;
};

export function ProjectPlanningHome({
  children,
  state,
  title = 'Next steps',
}: ProjectPlanningHomeProps) {
  if (state) {
    return (
      <Card
        as="section"
        className={styles.specimen}
        aria-label="Project planning"
        data-state={state}
      >
        <header className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </header>
        <p className={styles.state}>{state.toUpperCase()}</p>
        <p className={styles.description}>Epics · Features · Tasks and actions</p>
        <small className={styles.reference}>projects/ProjectPlanningHome</small>
        {children && <div className={styles.content}>{children}</div>}
      </Card>
    );
  }

  return (
    <section className={styles.home} aria-label="Project planning">
      {children}
    </section>
  );
}
