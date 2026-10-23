import { Card } from '@forge-org/ui';
import styles from './DownloadAction.module.css';
export interface DownloadActionProps {
  label: string;
  href?: string;
  state?: 'ready' | 'pending' | 'error';
  errorMessage?: string;
}
export function DownloadAction({
  label,
  href,
  state = 'ready',
  errorMessage,
}: DownloadActionProps) {
  const unavailable = state !== 'ready' || !href;
  return (
    <Card className={styles.download}>
      {unavailable ? (
        <span role={state === 'error' ? 'alert' : 'status'}>
          {state === 'error' ? (errorMessage ?? 'Download unavailable') : 'Preparing download'}
        </span>
      ) : (
        <a href={href} download>
          {label}
        </a>
      )}
    </Card>
  );
}
