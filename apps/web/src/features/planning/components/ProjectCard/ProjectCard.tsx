import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, StatusChip } from '@forge-org/ui';
import type { Project } from '@forge-org/api-client';
import styles from './ProjectCard.module.css';

type ProjectCardProps = { project: Project; workspaceId: string; children?: ReactNode };

export function ProjectCard({ project, workspaceId, children }: ProjectCardProps) {
  const archived = project.status === 'archived';
  return (
    <Card className={styles.card} data-state={archived ? 'Archived' : 'Active'}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h3>
            <Link to={`/planning/${workspaceId}/${project.id}`}>{project.name}</Link>
          </h3>
          <StatusChip tone={archived ? 'neutral' : 'success'}>{project.status}</StatusChip>
        </div>
        {children && <div className={styles.actions}>{children}</div>}
      </header>
      {project.description && <p className={styles.description}>{project.description}</p>}
    </Card>
  );
}
