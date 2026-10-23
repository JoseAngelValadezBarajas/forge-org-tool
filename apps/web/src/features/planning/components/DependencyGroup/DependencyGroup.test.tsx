import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { DependencyGroup } from './DependencyGroup';

afterEach(cleanup);

describe('DependencyGroup', () => {
  it('exposes the canonical blocked state while preserving the relationship', () => {
    render(<DependencyGroup blocker="Foundation" blocked="Dashboard" />);

    expect(screen.getByRole('group', { name: 'Foundation blocks Dashboard' })).toHaveAttribute(
      'data-state',
      'Blocked',
    );
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
  });

  it('supports the clear state and lets archived retain precedence', () => {
    const { rerender } = render(
      <DependencyGroup blocker="Foundation" blocked="Dashboard" state="Clear" />,
    );
    expect(screen.getByRole('group', { name: 'Foundation blocks Dashboard' })).toHaveAttribute(
      'data-state',
      'Clear',
    );
    expect(screen.getByText('CLEAR')).toBeInTheDocument();

    rerender(<DependencyGroup blocker="Foundation" blocked="Dashboard" state="Blocked" archived />);
    expect(screen.getByRole('group', { name: 'Foundation blocks Dashboard' })).toHaveAttribute(
      'data-state',
      'Archived',
    );
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  });

  it('states the directed dependency and retains its removal action', () => {
    render(
      <DependencyGroup blocker="Foundation" blocked="Dashboard">
        <button>Remove dependency</button>
      </DependencyGroup>,
    );
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove dependency' })).toBeInTheDocument();
  });
});
