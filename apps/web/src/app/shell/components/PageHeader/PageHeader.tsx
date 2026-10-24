import type { ReactNode } from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '@corefoundry-labs/forge-ui';
import styles from './PageHeader.module.css';
export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  children?: ReactNode;
  className?: string;
}
export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumbs,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={[styles.header, className].filter(Boolean).join(' ')} aria-label={title}>
      <div className={styles.copy}>
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <p>{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <span>{description}</span>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}
