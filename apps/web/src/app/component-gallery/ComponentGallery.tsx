import { useState } from 'react';
import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import styles from './ComponentGallery.module.css';
/** Dev-only route. All examples are demonstrations, never real application data. */
export function ComponentGallery() {
  const [light, setLight] = useState(false);
  const [counter, setCounter] = useState(0);
  return <div className={styles.gallery} data-theme={light ? 'light' : 'dark'}>
    <SectionHeader eyebrow="Figma: Core UI / Page 19" title="Component Gallery" actions={<Button variant="secondary" onClick={() => setLight((n) => !n)}>Switch to {light ? 'dark' : 'light'}</Button>} />
    <p>Actual reusable React primitives. Demonstration only. 23 legacy design-token differences await reconciliation.</p>
    <div className={styles.grid}>
      <Card><h3>Buttons</h3><div className={styles.row}>
        <Button onClick={() => setCounter((n) => n + 1)}>Increment {counter}</Button>
        <Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button><Button loading>Loading</Button><Button disabled>Disabled</Button>
      </div></Card>
      <Card><h3>Status tones (presentation only)</h3><div className={styles.row}>
        <StatusChip>Neutral</StatusChip><StatusChip tone="accent">Accent</StatusChip>
        <StatusChip tone="success">Action completed</StatusChip>
        <StatusChip tone="warning">Review required</StatusChip><StatusChip tone="danger">Error</StatusChip>
      </div></Card>
    </div>
    <p className={styles.caption}>This is not a replacement for Figma visual review or real keyboard/accessibility tests. No backend calls are made here.</p>
  </div>;
}
