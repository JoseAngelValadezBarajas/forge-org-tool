import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import type { Criterion } from '@forge-org/api-client';
import { CriterionItem } from './CriterionItem';

const criterion: Criterion = {
  id: 'c1',
  feature_id: 'f1',
  description: 'Keyboard accessible',
  position: 0,
  satisfied: true,
  created_at: '',
  updated_at: '',
};

describe('CriterionItem', () => {
  it('announces criterion satisfaction without implying verification', () => {
    render(
      <ul>
        <CriterionItem criterion={criterion} />
      </ul>,
    );
    expect(screen.getByRole('listitem')).toHaveAttribute('data-state', 'Satisfied');
    expect(screen.getByText('Satisfied')).toBeInTheDocument();
    expect(screen.getByText('Keyboard accessible')).toBeInTheDocument();
  });
});
