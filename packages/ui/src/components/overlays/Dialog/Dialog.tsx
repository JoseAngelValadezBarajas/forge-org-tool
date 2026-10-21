import { useEffect, useId, useRef, type DialogHTMLAttributes, type ReactNode } from 'react';
import styles from './Dialog.module.css';
export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title'> {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  variant?: 'confirm' | 'destructive' | 'busy';
}
export function Dialog({
  title,
  description,
  children,
  actions,
  variant = 'confirm',
  open = false,
  className,
  ...props
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = `forge-dialog-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      {...props}
      ref={ref}
      aria-modal="true"
      aria-busy={variant === 'busy' || undefined}
      data-variant={variant}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={[styles.dialog, styles[variant], className].filter(Boolean).join(' ')}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      {description && <p id={`${id}-description`}>{description}</p>}
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </dialog>
  );
}
