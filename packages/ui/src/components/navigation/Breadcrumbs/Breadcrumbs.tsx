import type { HTMLAttributes } from 'react';
import styles from './Breadcrumbs.module.css';
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  items: readonly BreadcrumbItem[];
  label?: string;
}
export function Breadcrumbs({
  items,
  label = 'Breadcrumb',
  className,
  ...props
}: BreadcrumbsProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      className={[styles.nav, className].filter(Boolean).join(' ')}
    >
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className={styles.item}>
            {index > 0 && (
              <span aria-hidden="true" className={styles.separator}>
                /
              </span>
            )}
            {index === items.length - 1 || !item.href ? (
              <span aria-current={index === items.length - 1 ? 'page' : undefined}>
                {item.label}
              </span>
            ) : (
              <a href={item.href}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
