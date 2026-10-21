import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

afterEach(cleanup);

it('renders an accessible empty region with optional actions and caller class', () => {
  render(
    <EmptyState
      title="No projects"
      description="Create a project to begin."
      actions={<button>Create project</button>}
      className="consumer-layout"
    />,
  );

  expect(screen.getByRole('region', { name: 'No projects' })).toHaveClass('consumer-layout');
  expect(screen.getByText('Create a project to begin.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
});
