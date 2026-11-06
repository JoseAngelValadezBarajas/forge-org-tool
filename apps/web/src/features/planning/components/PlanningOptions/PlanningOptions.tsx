import { PLANNING_COLUMN_STATUSES } from '../KanbanColumn';

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

const capitalized = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/** `<option>` list for a priority or severity `<select>`; one definition for every planning form. */
export function PriorityOptions({ capitalize = false }: { capitalize?: boolean }) {
  return PRIORITIES.map((value) => (
    <option key={value} value={value}>
      {capitalize ? capitalized(value) : value}
    </option>
  ));
}

/** `<option>` list for the five planning workflow columns. */
export function StatusOptions({ prefix = '' }: { prefix?: string }) {
  return PLANNING_COLUMN_STATUSES.map(({ value, label }) => (
    <option key={value} value={value}>
      {`${prefix}${label}`}
    </option>
  ));
}
