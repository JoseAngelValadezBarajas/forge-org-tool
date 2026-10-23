import '@forge-org/tokens/tokens.css';

// Platform appearance utility; preference and persistence remain consumer-owned.
export { useSystemTheme } from './hooks';
export type { SystemTheme } from './hooks';

// Actions
export { Button } from './components/actions/Button';
export type { ButtonProps, ButtonSize } from './components/actions/Button';
export { IconButton } from './components/actions/IconButton';
export type { IconButtonProps } from './components/actions/IconButton';

// Forms
export { TextInput } from './components/forms/TextInput';
export type { TextInputProps } from './components/forms/TextInput';
// Compatibility aliases retained for existing application consumers.
export { TextInput as Input } from './components/forms/TextInput';
export type { TextInputProps as InputProps } from './components/forms/TextInput';
export { Checkbox } from './components/forms/Checkbox';
export type { CheckboxProps } from './components/forms/Checkbox';
export { Select } from './components/forms/Select';
export type { SelectProps } from './components/forms/Select';
export { Textarea } from './components/forms/Textarea';
export type { TextareaProps } from './components/forms/Textarea';
export { FormField } from './components/forms/FormField';
export type { FormFieldProps } from './components/forms/FormField';
export { SearchField } from './components/forms/SearchField';
export type { SearchFieldProps } from './components/forms/SearchField';
export { MultiSelect } from './components/forms/MultiSelect';
export type { MultiSelectOption, MultiSelectProps } from './components/forms/MultiSelect';
export { FilePicker } from './components/forms/FilePicker';
export type { FilePickerProps, FilePickerState } from './components/forms/FilePicker';
export { FormActions } from './components/forms/FormActions';
export type { FormActionsProps, FormActionsState } from './components/forms/FormActions';
export { Radio } from './components/forms/Radio';
export type { RadioProps } from './components/forms/Radio';
export { Switch } from './components/forms/Switch';
export type { SwitchProps } from './components/forms/Switch';

// Navigation
export { Tabs } from './components/navigation/Tabs';
export type { TabsProps, TabItem } from './components/navigation/Tabs';
export { Breadcrumbs } from './components/navigation/Breadcrumbs';
export type { BreadcrumbsProps, BreadcrumbItem } from './components/navigation/Breadcrumbs';
export { MenuItem } from './components/navigation/MenuItem';
export type { MenuItemProps } from './components/navigation/MenuItem';
export { StepperStep } from './components/navigation/StepperStep';
export type { StepperStepProps } from './components/navigation/StepperStep';

// Surfaces and status
export { Card } from './components/surfaces/Card';
export type { CardProps } from './components/surfaces/Card';
export { MetricCard } from './components/surfaces/MetricCard';
export type { MetricCardProps } from './components/surfaces/MetricCard';
export { StatusChip } from './components/status/StatusChip';
export type { StatusChipProps } from './components/status/StatusChip';
export { Badge } from './components/status/Badge';
export type { BadgeProps } from './components/status/Badge';

// Feedback
export { Alert } from './components/feedback/Alert';
export type { AlertProps } from './components/feedback/Alert';
export { StatePanel } from './components/feedback/StatePanel';
export type { StatePanelProps } from './components/feedback/StatePanel';
export { Progress } from './components/feedback/Progress';
export type { ProgressProps } from './components/feedback/Progress';
export { Tooltip } from './components/feedback/Tooltip';
export type { TooltipProps } from './components/feedback/Tooltip';
export { Skeleton } from './components/feedback/Skeleton';
export type { SkeletonProps } from './components/feedback/Skeleton';
export { Toast } from './components/feedback/Toast';
export type { ToastProps } from './components/feedback/Toast';
export { EmptyState } from './components/feedback/EmptyState';
export type { EmptyStateProps } from './components/feedback/EmptyState';
export { LoadingState } from './components/feedback/LoadingState';
export type { LoadingStateProps } from './components/feedback/LoadingState';
export { ErrorState } from './components/feedback/ErrorState';
export type { ErrorStateProps } from './components/feedback/ErrorState';

// Data display
export { RecordRow } from './components/data-display/RecordRow';
export type { RecordRowProps } from './components/data-display/RecordRow';
export { KeyValueRow } from './components/data-display/KeyValueRow';
export type { KeyValueRowProps } from './components/data-display/KeyValueRow';
export { TableRow } from './components/data-display/TableRow';
export type { TableRowProps } from './components/data-display/TableRow';
export { Table } from './components/data-display/Table';
export type { TableProps, TableColumn } from './components/data-display/Table';

// Overlays
export { Dialog } from './components/overlays/Dialog';
export type { DialogProps } from './components/overlays/Dialog';
export { Popover } from './components/overlays/Popover';
export type { PopoverProps } from './components/overlays/Popover';

// Other shared compositions
export { SectionHeader } from './components/layout/SectionHeader';
export type { SectionHeaderProps } from './components/layout/SectionHeader';
export { Divider } from './components/layout/Divider';
export type { DividerProps } from './components/layout/Divider';
export { CodeLabel } from './components/layout/CodeLabel';
export type { CodeLabelProps } from './components/layout/CodeLabel';
