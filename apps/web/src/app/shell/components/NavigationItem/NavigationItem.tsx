import type { ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import styles from './NavigationItem.module.css';
export interface NavigationItemProps extends Omit<NavLinkProps, 'children'> {
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}
export function NavigationItem({
  label,
  className,
  disabled = false,
  icon = '◦',
  ...props
}: NavigationItemProps) {
  if (disabled) {
    return (
      <span
        className={[styles.item, styles.disabled, typeof className === 'string' ? className : '']
          .filter(Boolean)
          .join(' ')}
        aria-disabled="true"
      >
        {icon}
        <span className={styles.label} data-navigation-label="true">
          {label}
        </span>
      </span>
    );
  }

  return (
    <NavLink
      {...props}
      className={({ isActive }) =>
        [styles.item, isActive && styles.active, typeof className === 'string' ? className : '']
          .filter(Boolean)
          .join(' ')
      }
    >
      {icon}
      <span className={styles.label} data-navigation-label="true">
        {label}
      </span>
    </NavLink>
  );
}
