import { useId } from 'react';
import { Select } from '@corefoundry-labs/forge-ui';
import styles from './WorkspaceSwitcher.module.css';
export interface WorkspaceOption {
  id: string;
  name: string;
}
export interface WorkspaceSwitcherProps {
  value?: string;
  workspaces?: WorkspaceOption[];
  onChange?: (id: string) => void;
  currentName?: string;
  dataNodeId?: string;
}
export function WorkspaceSwitcher({
  value = '',
  workspaces = [],
  onChange,
  currentName = 'Local Workspace',
  dataNodeId,
}: WorkspaceSwitcherProps) {
  const id = useId();
  if (workspaces.length > 0 && onChange) {
    const selectedName =
      workspaces.find((workspace) => workspace.id === value)?.name ?? currentName;
    return (
      <div className={styles.field} data-node-id={dataNodeId}>
        <label htmlFor={id}>Workspace</label>
        <span className={styles.selector}>
          <Select
            id={id}
            className={styles.select}
            aria-label="Workspace"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </Select>
          <span className={styles.selectedName} aria-hidden="true">
            {selectedName}&nbsp;&nbsp;▾
          </span>
        </span>
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
