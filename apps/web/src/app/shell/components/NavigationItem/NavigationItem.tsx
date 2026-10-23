import { NavLink, type NavLinkProps } from 'react-router-dom';
import styles from './NavigationItem.module.css';
export interface NavigationItemProps extends Omit<NavLinkProps, 'children'> {
  label: string;
  disabled?: boolean;
}
export function NavigationItem({
  label,
  className,
  disabled = false,
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
        {label}
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
      {label}
    </NavLink>
  );
}
