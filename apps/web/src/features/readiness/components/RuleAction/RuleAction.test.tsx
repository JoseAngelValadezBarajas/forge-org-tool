import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { RuleAction } from './RuleAction';

describe('RuleAction', () => {
  it('keeps archived actions disabled and never invokes their callback', () => {
    const onClick = vi.fn();
    render(
      <RuleAction archived onClick={onClick}>
        Refresh rule
      </RuleAction>,
    );
    const button = screen.getByRole('button', { name: 'Refresh rule' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
