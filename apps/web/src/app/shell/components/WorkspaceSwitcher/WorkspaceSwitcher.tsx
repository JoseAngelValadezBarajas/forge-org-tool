import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, Folder, Settings } from '@corefoundry-labs/forge-icons';
import styles from './WorkspaceSwitcher.module.css';

export interface WorkspaceOption {
  id: string;
  name: string;
}

export interface WorkspaceSwitcherProps {
  value?: string;
  workspaces?: WorkspaceOption[];
  onChange?: (id: string) => void;
  onManage?: () => void;
  currentName?: string;
  dataNodeId?: string;
  compact?: boolean;
}

export function WorkspaceSwitcher({
  value = '',
  workspaces = [],
  onChange,
  onManage,
  currentName = 'Local Workspace',
  dataNodeId,
  compact = false,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const wasOpen = useRef(false);
  const selectedName = workspaces.find((workspace) => workspace.id === value)?.name ?? currentName;

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  if ((onChange || onManage) && (workspaces.length > 0 || onManage)) {
    return (
      <div
        className={[styles.field, compact && styles.compactField].filter(Boolean).join(' ')}
        data-node-id={dataNodeId}
        data-testid={compact ? 'workspace-compact-control' : undefined}
      >
        <span className={compact ? styles.compactLabel : undefined}>Workspace</span>
        <div className={styles.selector} onKeyDown={handleKeyDown}>
          <button
            type="button"
            className={[styles.trigger, compact && styles.compactTrigger].filter(Boolean).join(' ')}
            aria-label={`Workspace: ${selectedName}`}
            aria-haspopup="menu"
            aria-expanded={open}
            ref={triggerRef}
            onClick={() => setOpen((isOpen) => !isOpen)}
          >
            {compact && <Folder className={styles.compactIcon} aria-hidden="true" size={20} />}
            <span className={styles.selectedName}>{selectedName}</span>
            <ChevronDown aria-hidden="true" size={14} className={styles.chevron} />
          </button>
          {open && (
            <div className={styles.menu} role="menu" aria-label="Workspaces">
              {onManage && (
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  ref={(node) => {
                    itemRefs.current[0] = node;
                  }}
                  onClick={() => {
                    setOpen(false);
                    onManage();
                  }}
                >
                  <Settings aria-hidden="true" size={15} />
                  <span>Manage workspaces</span>
                </button>
              )}
              {onManage && workspaces.length > 0 && (
                <div className={styles.menuSeparator} role="separator" />
              )}
              {workspaces.map((workspace, index) => (
                <button
                  key={workspace.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={workspace.id === value}
                  className={styles.menuItem}
                  ref={(node) => {
                    itemRefs.current[index + (onManage ? 1 : 0)] = node;
                  }}
                  onClick={() => {
                    setOpen(false);
                    onChange?.(workspace.id);
                  }}
                >
                  <span className={styles.menuIndicator} aria-hidden="true">
                    {workspace.id === value ? '•' : ''}
                  </span>
                  <span>{workspace.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const current = workspaces.find((workspace) => workspace.id === value)?.name ?? currentName;
  return (
    <div
      className={styles.current}
      role="status"
      aria-label="Current workspace"
      data-node-id={dataNodeId}
    >
      <span>{current}</span>
      <small>Workspace</small>
    </div>
  );
}
