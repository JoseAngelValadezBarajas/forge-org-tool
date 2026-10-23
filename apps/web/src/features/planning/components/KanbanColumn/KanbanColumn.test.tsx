import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { KanbanColumn } from './KanbanColumn';

describe('KanbanColumn', () => {
  it('names its section and exposes the empty state accessibly', () => {
    render(<KanbanColumn status="backlog" />);
    expect(screen.getByRole('region', { name: 'Backlog' })).toBeInTheDocument();
    expect(screen.getByText('No features in this status.')).toBeInTheDocument();
  });

  it('renders its feature cards without replacing their behavior', () => {
    render(
      <KanbanColumn status="in_progress">
        <a href="/feature">Feature</a>
      </KanbanColumn>,
    );
    expect(screen.getByRole('link', { name: 'Feature' })).toHaveAttribute('href', '/feature');
  });
});
