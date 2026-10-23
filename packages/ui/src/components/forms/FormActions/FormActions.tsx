import type { HTMLAttributes, ReactNode } from 'react';
import { Button } from '../../actions/Button';
import styles from './FormActions.module.css';

export type FormActionsState = 'default' | 'saving' | 'readOnly';
export interface FormActionsProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  align?: 'start' | 'end' | 'between';
  state?: FormActionsState;
  onCancel?: () => void;
  onSave?: () => void;
  cancelLabel?: string;
  saveLabel?: string;
}
export function FormActions({
  children,
  align = 'end',
  state = 'default',
  onCancel,
  onSave,
  cancelLabel = 'Cancel',
  saveLabel = 'Save',
  className,
  ...props
}: FormActionsProps) {
  const actions = children ?? (
    <>
      <Button variant="secondary" disabled={state !== 'default'} onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant="primary"
        disabled={state === 'readOnly'}
        loading={state === 'saving'}
        loadingLabel="Saving…"
        onClick={onSave}
      >
        {state === 'saving' ? 'Saving…' : saveLabel}
      </Button>
    </>
  );
  return (
    <div
      {...props}
      data-align={align}
      data-state={state}
      aria-busy={state === 'saving' || undefined}
      className={[styles.actions, styles[align], className].filter(Boolean).join(' ')}
    >
      {actions}
    </div>
  );
}
