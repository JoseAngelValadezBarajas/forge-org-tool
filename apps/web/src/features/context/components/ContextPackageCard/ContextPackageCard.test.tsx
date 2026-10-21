import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { ContextPackage } from '@forge-org/api-client';
import { ContextPackageCard } from './ContextPackageCard';

const contextPackage: ContextPackage = {
  id: 'cp1',
  project_id: 'p1',
  feature_id: 'f1',
  schema_version: 'v1',
  fingerprint: 'sha256:abc',
  payload_json: '{}',
  markdown: '# Snapshot',
  created_at: '',
};

describe('ContextPackageCard', () => {
  it('shows the immutable snapshot fingerprint and keeps download actions available', () => {
    render(
      <ContextPackageCard contextPackage={contextPackage}>
        <a href="/download">JSON</a>
      </ContextPackageCard>,
    );
    expect(screen.getByText('sha256:abc')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JSON' })).toHaveAttribute('href', '/download');
  });
});
