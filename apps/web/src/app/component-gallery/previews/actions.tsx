import type { ReactNode } from 'react';
import { Button, Card, IconButton } from '@corefoundry-labs/forge-ui';
import { Plus } from '@corefoundry-labs/forge-icons';
import styles from '../ComponentGallery.module.css';

interface ActionPreviewContext {
  count: number;
  onIncrement: () => void;
}

export function renderActionPreview(
  componentId: string,
  { count, onIncrement }: ActionPreviewContext,
): ReactNode | null {
  switch (componentId) {
    case 'button':
      return (
        <Card>
          <div className={styles.previewRow}>
            <Button onClick={onIncrement}>Increment {count}</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className={styles.previewRow} data-component-id="button-size">
            <Button size="small">Small</Button>
            <Button size="medium" variant="secondary">
              Medium
            </Button>
            <Button size="large" variant="secondary">
              Large
            </Button>
          </div>
        </Card>
      );
    case 'button-size':
      return (
        <Card>
          <div className={styles.previewRow}>
            <Button size="small">Small</Button>
            <Button size="medium" variant="secondary">
              Medium
            </Button>
            <Button size="large" variant="secondary">
              Large
            </Button>
          </div>
        </Card>
      );
    case 'icon-button':
      return (
        <div className={styles.previewRow}>
          <IconButton aria-label="Add item">
            <Plus size={18} />
          </IconButton>
          <IconButton aria-label="Loading item" loading>
            <Plus size={18} />
          </IconButton>
          <IconButton aria-label="Unavailable item" disabled>
            <Plus size={18} />
          </IconButton>
        </div>
      );
    default:
      return null;
  }
}
