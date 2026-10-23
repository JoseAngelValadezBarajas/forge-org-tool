import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { Epic, Feature } from '@forge-org/api-client';
import { EpicCard } from './EpicCard';

const epic: Epic & { features: Feature[] } = {
  id: 'e1',
  project_id: 'p1',
  title: 'Launch',
  description: null,
  status: 'backlog',
  archived_at: null,
  priority: 'critical',
  tags: ['Platform'],
  feature_count: 2,
  completed_feature_count: 1,
  progress: 50,
  created_at: '',
  updated_at: '',
  features: [
    {
      id: 'f1',
      project_id: 'p1',
      epic_id: 'e1',
      title: 'Alpha',
      description: null,
      goal: null,
      priority: 'high',
      status: 'done',
      created_at: '',
      updated_at: '',
    },
  ],
};

describe('EpicCard', () => {
  afterEach(cleanup);
  it('keeps Epic workflow state explicit while showing progress from child work items', () => {
    render(
      <EpicCard epic={epic}>
        <a href="/feature">Open feature</a>
      </EpicCard>,
    );
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('2 work items · 50% complete')).toBeInTheDocument();
    expect(screen.getByText('Priority: critical')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Launch tags' })).toHaveTextContent('Platform');
    expect(screen.getByRole('link', { name: 'Open feature' })).toBeInTheDocument();
  });

  it('shows an explicitly completed Epic without inferring it from child completion', () => {
    render(<EpicCard epic={{ ...epic, status: 'done' }} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('2 work items · 50% complete')).toBeInTheDocument();
  });

  it('links the title only when route context is provided', () => {
    const { rerender } = render(
      <MemoryRouter>
        <EpicCard epic={epic} href="/planning/w1/p1/epics/e1" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Launch' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/epics/e1',
    );
    rerender(
      <MemoryRouter>
        <EpicCard epic={epic} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: 'Launch' })).not.toBeInTheDocument();
  });
});
