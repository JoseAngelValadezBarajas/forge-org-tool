import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectPlanningHome } from './ProjectPlanningHome';

describe('ProjectPlanningHome', () => {
  afterEach(cleanup);

  it('provides a named planning landmark around the existing working view', () => {
    render(
      <ProjectPlanningHome>
        <button>Create feature</button>
      </ProjectPlanningHome>,
    );
    expect(screen.getByRole('region', { name: 'Project planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create feature' })).toBeInTheDocument();
  });

  it.each([
    ['Default', 'DEFAULT'],
    ['Empty', 'EMPTY'],
    ['Archived', 'ARCHIVED'],
  ] as const)('renders the canonical %s presentation state', (state, label) => {
    render(<ProjectPlanningHome state={state} title="Next steps" />);

    const planning = screen.getByRole('region', { name: 'Project planning' });
    expect(planning).toHaveAttribute('data-state', state);
    expect(planning).toHaveTextContent(label);
    expect(planning).toHaveTextContent('Epics · Features · Tasks and actions');
    expect(planning).toHaveTextContent('projects/ProjectPlanningHome');
  });
});
