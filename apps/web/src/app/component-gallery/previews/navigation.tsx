import type { ReactNode } from 'react';
import { Breadcrumbs, Card, MenuItem, StepperStep, Tabs } from '@corefoundry-labs/forge-ui';
import styles from '../ComponentGallery.module.css';

export function renderNavigationPreview(
  componentId: string,
  onSelect: () => void,
): ReactNode | null {
  switch (componentId) {
    case 'tabs':
      return (
        <Card>
          <Tabs
            label="Preview tabs"
            tabs={[
              { id: 'overview', label: 'Overview', content: <p>Overview content</p> },
              { id: 'activity', label: 'Activity', content: <p>Recent activity</p> },
              {
                id: 'unavailable',
                label: 'Unavailable',
                content: <p>Disabled tab</p>,
                disabled: true,
              },
              { id: 'settings', label: 'Settings', content: <p>Workspace settings</p> },
            ]}
          />
        </Card>
      );
    case 'breadcrumbs':
      return (
        <Card>
          <Breadcrumbs
            items={[
              { label: 'Workspace', href: '#' },
              { label: 'Project', href: '#' },
              { label: 'Feature' },
            ]}
          />
        </Card>
      );
    case 'menu-item':
      return (
        <Card>
          <div role="menu" aria-label="Example actions" className={styles.menuPreview}>
            <MenuItem onSelect={onSelect}>Refresh data</MenuItem>
            <MenuItem destructive>Remove connection</MenuItem>
            <MenuItem disabled>Unavailable action</MenuItem>
            <MenuItem selected>Selected action</MenuItem>
          </div>
        </Card>
      );
    case 'stepper-step':
      return (
        <Card>
          <ol className={styles.stepperPreview} aria-label="Transfer steps">
            <StepperStep label="Select source" state="complete" index={1} />
            <StepperStep label="Review planning" state="current" index={2} />
            <StepperStep label="Confirm" state="upcoming" index={3} />
          </ol>
        </Card>
      );
    default:
      return null;
  }
}
