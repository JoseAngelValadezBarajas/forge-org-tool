import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { StepperStep } from './StepperStep';
describe('StepperStep', () => {
  it('announces current step and completion state', () => {
    render(
      <ol>
        <StepperStep label="Review" state="current" />
        <StepperStep label="Build" state="complete" />
      </ol>,
    );
    expect(screen.getByText('Review').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Build').closest('li')).toHaveAttribute('data-state', 'complete');
  });
});
