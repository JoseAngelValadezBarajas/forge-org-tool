import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, SearchField } from '@forge-org/ui';
import styles from './CommandPalette.module.css';
export interface PaletteCommand {
  id: string;
  label: string;
  onSelect: () => void;
}
export interface CommandPaletteProps {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}
export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  if (!open) return null;
  return <CommandPaletteDialog commands={commands} onClose={onClose} />;
}

function CommandPaletteDialog({ commands, onClose }: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchRef.current?.focus();
    return () => returnFocus?.focus();
  }, []);
  const visible = commands.filter((command) =>
    command.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'Tab') {
      const elements = event.currentTarget.querySelectorAll<HTMLElement>(
        'input:not(:disabled), button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      );
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        className={styles.dialog}
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
      >
        <h2>Command palette</h2>
        <SearchField
          ref={searchRef}
          aria-label="Search commands"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search commands"
        />
        <div className={styles.commands}>
          {visible.map((command) => (
            <Button
              key={command.id}
              variant="ghost"
              onClick={command.onSelect}
              aria-label={`Go to ${command.label}`}
            >
              {command.label}
            </Button>
          ))}
          {visible.length === 0 && <p role="status">No matching commands.</p>}
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <p>Press Escape to close.</p>
      </dialog>
    </div>
  );
}
