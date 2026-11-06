import { DropdownMenuV2, type DropdownMenuV2Item } from '@corefoundry-labs/forge-ui';
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
  const selectedName = workspaces.find((workspace) => workspace.id === value)?.name ?? currentName;

  if ((onChange || onManage) && (workspaces.length > 0 || onManage)) {
    const items: DropdownMenuV2Item[] = [
      ...(onManage
        ? [
            {
              id: 'manage-workspaces',
              label: 'Manage workspaces',
              icon: <Settings aria-hidden="true" size={15} />,
              onSelect: onManage,
            },
          ]
        : []),
      ...(onManage && workspaces.length > 0
        ? [{ type: 'separator' as const, id: 'workspace-separator' }]
        : []),
      ...workspaces.map((workspace) => ({
        id: workspace.id,
        label: workspace.id === value ? `${workspace.name} (active)` : workspace.name,
        onSelect: () => onChange?.(workspace.id),
      })),
    ];

    return (
      <div
        className={[styles.field, compact && styles.compactField].filter(Boolean).join(' ')}
        data-node-id={dataNodeId}
        data-testid={compact ? 'workspace-compact-control' : undefined}
      >
        <span className={compact ? styles.compactLabel : undefined}>Workspace</span>
        <div className={styles.selector}>
          <DropdownMenuV2
            aria-label="Workspaces"
            density="comfortable"
            items={items}
            trigger={
              <button
                type="button"
                className={[styles.trigger, compact && styles.compactTrigger]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`Workspace: ${selectedName}`}
              >
                {compact && <Folder className={styles.compactIcon} aria-hidden="true" size={20} />}
                <span className={styles.selectedName}>{selectedName}</span>
                <ChevronDown aria-hidden="true" size={14} className={styles.chevron} />
              </button>
            }
          />
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
