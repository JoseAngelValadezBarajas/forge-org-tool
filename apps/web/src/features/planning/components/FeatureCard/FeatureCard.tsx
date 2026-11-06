import type { ReactNode } from 'react';
import { BadgeV2, CardV2 } from '@corefoundry-labs/forge-ui';
import type { Feature } from '@forge-org/api-client';
import { Link } from 'react-router-dom';
import styles from './FeatureCard.module.css';

type FeatureCardProps = {
  feature: Feature;
  href: string;
  children?: ReactNode;
  readOnly?: boolean;
};

const statusLabel: Record<Feature['status'], string> = {
  backlog: 'backlog',
  refining: 'legacy refining',
  ready: 'ready',
  in_progress: 'in progress',
  verify: 'verify',
  done: 'done',
};

const statusTone: Record<Feature['status'], 'neutral' | 'primary' | 'success'> = {
  backlog: 'neutral',
  refining: 'neutral',
  ready: 'neutral',
  in_progress: 'primary',
  verify: 'primary',
  done: 'success',
};

export function FeatureCard({ feature, href, children, readOnly = false }: FeatureCardProps) {
  return (
    <CardV2 className={styles.card}>
      <div className={styles.heading}>
        <Link className={styles.title} to={href}>
          {feature.title}
        </Link>
        <div className={styles.chips}>
          <BadgeV2 tone={statusTone[feature.status]}>{statusLabel[feature.status]}</BadgeV2>
          {feature.kind === 'bug' && <BadgeV2 tone="error">Bug</BadgeV2>}
          <BadgeV2 tone="neutral">{feature.priority}</BadgeV2>
        </div>
      </div>
      {feature.description && <p className={styles.description}>{feature.description}</p>}
      {feature.goal && <p className={styles.goal}>{feature.goal}</p>}
      {feature.tags?.length ? <p>Tags: {feature.tags.join(', ')}</p> : null}
      {children && (
        <div className={styles.actions} aria-label="Feature planning actions">
          {children}
        </div>
      )}
      {readOnly && <span className={styles.readOnly}>Read only</span>}
    </CardV2>
  );
}
