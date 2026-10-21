import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { DependencyGroup } from './DependencyGroup';

describe('DependencyGroup', () => {
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
