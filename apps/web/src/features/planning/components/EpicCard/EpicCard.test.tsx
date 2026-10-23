import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { Epic, Feature } from '@forge-org/api-client';
import { EpicCard } from './EpicCard';

const epic: Epic & { features: Feature[] } = {
  id: 'e1',
  project_id: 'p1',
  title: 'Launch',
  description: null,
  status: 'planning',
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
  it('derives progress from child feature records and lists those records', () => {
    render(
      <EpicCard epic={epic}>
        <a href="/feature">Open feature</a>
      </EpicCard>,
    );
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('1 feature')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open feature' })).toBeInTheDocument();
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
