import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Tabs.module.css';
export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}
export interface TabsProps {
  tabs: readonly TabItem[];
  defaultValue?: string;
  label?: string;
  onChange?: (id: string) => void;
}
export function Tabs({ tabs, defaultValue, label = 'Tabs', onChange }: TabsProps) {
  const initial = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === defaultValue && !tab.disabled),
  );
  const [active, setActive] = useState(initial);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const select = (index: number) => {
    setActive(index);
    onChange?.(tabs[index]!.id);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    let next = index;
    for (let tries = 0; tries < tabs.length; tries += 1) {
      next = (next + delta + tabs.length) % tabs.length;
      if (!tabs[next]!.disabled) break;
    }
    select(next);
    refs.current[next]?.focus();
  };
  const current = tabs[active];
  if (!current) return null;
  return (
    <div className={styles.root}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls={`${tab.id}-panel`}
            tabIndex={index === active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`${current.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${current.id}-tab`}
        tabIndex={0}
        className={styles.panel}
      >
        {current.content}
      </div>
    </div>
  );
}
