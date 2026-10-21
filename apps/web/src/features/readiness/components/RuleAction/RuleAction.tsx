import { Button, type ButtonProps } from '@forge-org/ui';

export interface RuleActionProps extends Omit<ButtonProps, 'variant'> {
  archived?: boolean;
}

export function RuleAction({ archived = false, disabled, ...props }: RuleActionProps) {
  return <Button variant="secondary" disabled={archived || disabled} {...props} />;
}
