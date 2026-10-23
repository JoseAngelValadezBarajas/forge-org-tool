import { FormField, Select } from '@forge-org/ui';
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
}
export function WorkspaceSwitcher({
  value = '',
  workspaces = [],
  onChange,
  currentName = 'Local Workspace',
}: WorkspaceSwitcherProps) {
  if (workspaces.length > 0 && onChange)
    return (
      <FormField label="Workspace">
        <Select
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
      </FormField>
    );
  const current = workspaces.find((workspace) => workspace.id === value)?.name ?? currentName;
  return (
    <div className={styles.current} role="status" aria-label="Current workspace">
      <span>{current}</span>
      <small>Workspace</small>
    </div>
  );
}
