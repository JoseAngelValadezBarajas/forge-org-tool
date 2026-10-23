import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { ReadinessResult } from '@forge-org/api-client';
import { FeatureOverview } from './FeatureOverview';

const readiness: ReadinessResult = {
  feature_id: 'f1',
  evaluated_at: '',
  rule_set_version: 'R01',
  input_fingerprint: 'fp-1',
  outcome: 'NOT_READY',
  passed_checks: [],
  failed_checks: ['dependencies'],
  blockers: [{ code: 'DEPENDENCY', message: 'Blocked by API work' }],
  results: [],
};

describe('FeatureOverview', () => {
  it('distinguishes readiness blockers and preserves caller actions', () => {
    render(
      <FeatureOverview result={readiness}>
        <button>Refresh evaluation</button>
      </FeatureOverview>,
    );
    expect(screen.getByRole('region', { name: 'Feature readiness overview' })).toHaveAttribute(
      'data-state',
      'Blocked',
    );
    expect(screen.getByText('Blocked by API work')).toBeInTheDocument();
    expect(screen.getByText(/Input fingerprint: fp-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh evaluation' })).toBeInTheDocument();
  });
});
