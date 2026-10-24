import { useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Dialog,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Popover,
  Progress,
  Skeleton,
  StatePanel,
  Toast,
  Tooltip,
} from '@corefoundry-labs/forge-ui';
import styles from '../ComponentGallery.module.css';

type DialogVariant = 'confirm' | 'destructive' | 'busy';

export function renderFeedbackPreview(componentId: string): ReactNode | null {
  switch (componentId) {
    case 'alert':
      return (
        <div className={styles.previewStack}>
          <Alert
            tone="info"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
          <Alert
            tone="warning"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
          <Alert
            tone="error"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
          <Alert
            tone="success"
            heading="Context available"
            message="State clearly what happened and what to do next."
          />
        </div>
      );
    case 'empty-state':
      return (
        <EmptyState
          title="No records"
          description="A deterministic empty state preview."
          actions={<Button variant="secondary">Create record</Button>}
        />
      );
    case 'loading-state':
      return <LoadingState label="Loading preview" />;
    case 'error-state':
      return (
        <ErrorState
          title="Unable to load preview"
          actions={<Button variant="secondary">Retry</Button>}
        />
      );
    case 'progress':
      return (
        <div className={styles.previewStack}>
          <Progress value={0} max={100} label="Starting" presentation="panel" />
          <Progress value={64} max={100} label="In progress" presentation="panel" />
          <Progress value={100} max={100} label="Complete" presentation="panel" />
        </div>
      );
    case 'state-panel':
      return (
        <div className={styles.previewStack}>
          <StatePanel kind="loading" title="Loading" description="Reading local metadata." />
          <StatePanel kind="empty" title="No records" description="Nothing to show yet." />
          <StatePanel
            kind="readOnly"
            title="Planning-only workspace"
            description="No repository is required."
          />
          <StatePanel kind="error" title="Unavailable" description="Could not load this view." />
        </div>
      );
    case 'tooltip':
      return (
        <Card>
          <Tooltip content="This action records a human-reported update.">
            <Button variant="secondary">What is this?</Button>
          </Tooltip>
        </Card>
      );
    case 'skeleton':
      return (
        <Card>
          <div className={styles.skeletonPreview} aria-label="Loading record preview">
            <Skeleton aria-hidden="true" kind="text" />
            <Skeleton aria-hidden="true" kind="title" />
            <Skeleton aria-hidden="true" kind="avatar" />
            <Skeleton aria-hidden="true" kind="card" />
            <Skeleton aria-hidden="true" kind="list" />
          </div>
        </Card>
      );
    case 'toast':
      return (
        <div className={styles.previewStack}>
          <Toast tone="success">Workspace settings saved.</Toast>
          <Toast tone="error">Workspace could not be saved.</Toast>
          <Toast tone="info">A new observation is available.</Toast>
        </div>
      );
    case 'dialog':
      return <DialogPreview />;
    case 'popover':
      return (
        <Card>
          <Popover open trigger="Expanded details">
            <p>Local paths remain on this device.</p>
          </Popover>
          <Popover trigger="Collapsed details">
            <p>This content is initially collapsed.</p>
          </Popover>
        </Card>
      );
    case 'divider':
      return (
        <Card>
          <p>Repository metadata</p>
          <Divider />
          <p>Last observed just now</p>
        </Card>
      );
    default:
      return null;
  }
}

function DialogPreview() {
  const [active, setActive] = useState<DialogVariant | null>(null);
  const examples: Record<DialogVariant, { title: string; description: string; body: string }> = {
    confirm: {
      title: 'Confirm transfer',
      description: 'No data is saved until you confirm.',
      body: 'Review the included project planning data.',
    },
    destructive: {
      title: 'Remove repository',
      description: 'This action requires deliberate confirmation.',
      body: 'This cannot be undone.',
    },
    busy: {
      title: 'Saving transfer',
      description: 'A local transaction is in progress.',
      body: 'Please wait while the local transaction completes.',
    },
  };
  const current = active ? examples[active] : undefined;
  const close = () => setActive(null);
  return (
    <Card>
      <p>Open a dialog state to inspect its modal behavior.</p>
      <div className={styles.previewRow}>
        <Button onClick={() => setActive('confirm')}>Preview confirm dialog</Button>
        <Button variant="danger" onClick={() => setActive('destructive')}>
          Preview destructive dialog
        </Button>
        <Button variant="secondary" onClick={() => setActive('busy')}>
          Preview busy dialog
        </Button>
      </div>
      {active && current && (
        <Dialog
          open
          variant={active}
          title={current.title}
          description={current.description}
          onClose={close}
          actions={
            <>
              <Button variant="secondary" onClick={close}>
                Close preview
              </Button>
              {active !== 'busy' && <Button onClick={close}>Confirm preview</Button>}
            </>
          }
        >
          {current.body}
        </Dialog>
      )}
    </Card>
  );
}
