import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { DeliverySummary } from './DeliverySummary';

describe('DeliverySummary', () => {
  it('presents the four delivery truth-state metrics', () => {
    render(<DeliverySummary evidenceCount={3} candidateCount={2} ruleCount={4} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('NOT_PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText('reported records')).toBeInTheDocument();
    expect(screen.getByText('reviewable snapshots')).toBeInTheDocument();
    expect(screen.getByText('deterministic checks')).toBeInTheDocument();
  });
});
