import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Project } from '@forge-org/api-client';
import { ProjectCard } from './ProjectCard';

const project: Project = {
  id: 'p1',
  workspace_id: 'w1',
  name: 'Forge',
  description: 'Local-first work',
  status: 'active',
  created_at: '',
  updated_at: '',
};

describe('ProjectCard', () => {
  it('links to planning, identifies archival status and preserves management actions', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} workspaceId="w1">
          <button>Archive</button>
        </ProjectCard>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Forge' })).toHaveAttribute('href', '/planning/w1/p1');
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Local-first work')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });
});
