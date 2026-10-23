import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Feature } from '@forge-org/api-client';
import { FeatureCard } from './FeatureCard';

const feature: Feature = {
  id: 'feature-1',
  project_id: 'project-1',
  epic_id: null,
  title: 'Improve planning',
  description: null,
  goal: null,
  priority: 'high',
  status: 'in_progress',
  created_at: '',
  updated_at: '',
};

describe('FeatureCard', () => {
  it('presents the real planning status and priority and retains caller actions', () => {
    render(
      <MemoryRouter>
        <FeatureCard feature={feature} href="/planning/w1/p1/features/feature-1">
          <button type="button">Edit priority</button>
        </FeatureCard>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Improve planning' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/features/feature-1',
    );
    expect(screen.getByText('in progress')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit priority' })).toBeInTheDocument();
  });
});
