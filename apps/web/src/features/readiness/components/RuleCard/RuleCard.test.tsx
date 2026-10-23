import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { RuleCard } from './RuleCard';

describe('RuleCard', () => {
  it('shows a deterministic rule result and explanation', () => {
    render(<RuleCard ruleId="R03" result="BLOCKED" explanation="Dependency missing" />);
    expect(screen.getByRole('article', { name: 'R03' })).toHaveTextContent('BLOCKED');
    expect(screen.getByText('Dependency missing')).toBeInTheDocument();
  });
});
