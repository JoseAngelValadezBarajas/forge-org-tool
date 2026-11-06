import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeV2, CardV2 } from '@corefoundry-labs/forge-ui';
import type { Project } from '@forge-org/api-client';
import styles from './ProjectCard.module.css';

type ProjectCardProps = {
  project: Project;
  workspaceId: string;
  href?: string;
  children?: ReactNode;
};

export function ProjectCard({ project, workspaceId, href, children }: ProjectCardProps) {
  const archived = project.status === 'archived';
  return (
    <CardV2 className={styles.card} data-state={archived ? 'Archived' : 'Active'}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h3>
            <Link to={href ?? `/projects/${workspaceId}/${project.id}`}>{project.name}</Link>
          </h3>
          <BadgeV2 tone={archived ? 'neutral' : 'success'}>{project.status}</BadgeV2>
        </div>
        {children && <div className={styles.actions}>{children}</div>}
      </header>
      {project.description && <p className={styles.description}>{project.description}</p>}
    </CardV2>
  );
}
