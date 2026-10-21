import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { Observation, Repository } from '@forge-org/api-client';
import { RepositoryCard } from './RepositoryCard';

const repository: Repository = {
  id: 'r1',
  project_id: 'p1',
  root_path: 'C:/repo',
  status: 'connected',
  created_at: '',
  updated_at: '',
};
const observation: Observation = {
  id: 'o1',
  repository_id: 'r1',
  branch: 'main',
  clean: true,
  detached: false,
  error_code: null,
  head_sha: 'abc123',
  observed_at: '',
  observer_version: '1',
  source_content_read: false,
  staged_count: 0,
  status: 'observed',
  tracked_modified_count: 0,
  unborn: false,
  untracked_count: 0,
};

describe('RepositoryCard', () => {
  it('distinguishes connected metadata and explicitly discloses read-only observation', () => {
    render(
      <RepositoryCard repository={repository} observation={observation}>
        <button>Observe metadata</button>
      </RepositoryCard>,
    );
    expect(screen.getByText('C:/repo')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Latest observation: main · source content: no')).toBeInTheDocument();
    expect(screen.getByText('Source content').nextElementSibling).toHaveTextContent('not read');
    expect(screen.getByRole('button', { name: 'Observe metadata' })).toBeInTheDocument();
  });
});
