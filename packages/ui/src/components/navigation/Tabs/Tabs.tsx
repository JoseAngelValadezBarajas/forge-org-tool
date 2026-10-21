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
  const requested = tabs.findIndex((tab) => tab.id === defaultValue && !tab.disabled);
  const firstEnabled = tabs.findIndex((tab) => !tab.disabled);
  const initial = requested >= 0 ? requested : firstEnabled;
  const [active, setActive] = useState(initial);
  const activeIndex = tabs[active] && !tabs[active].disabled ? active : firstEnabled;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const select = (index: number) => {
    const tab = tabs[index];
    if (!tab || tab.disabled) return;
    setActive(index);
    onChange?.(tab.id);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    if (firstEnabled < 0) return;
    let next = index;
    for (let tries = 0; tries < tabs.length; tries += 1) {
      next = (next + delta + tabs.length) % tabs.length;
      if (!tabs[next]!.disabled) {
        select(next);
        refs.current[next]?.focus();
        return;
      }
    }
  };
  const current = tabs[activeIndex];
  if (tabs.length === 0) return null;
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
            aria-selected={index === activeIndex}
            aria-controls={`${tab.id}-panel`}
            tabIndex={index === activeIndex ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current && (
        <div
          id={`${current.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${current.id}-tab`}
          tabIndex={0}
          className={styles.panel}
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
