import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { ProjectPlanningHome } from './ProjectPlanningHome';

describe('ProjectPlanningHome', () => {
  it('provides a named planning landmark around the existing working view', () => {
    render(
      <ProjectPlanningHome>
        <button>Create feature</button>
      </ProjectPlanningHome>,
    );
    expect(screen.getByRole('region', { name: 'Project planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create feature' })).toBeInTheDocument();
  });
});
