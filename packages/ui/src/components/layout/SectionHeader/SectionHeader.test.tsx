import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { SectionHeader } from './SectionHeader';
describe('SectionHeader', () => {
  it('supports optional counter composition and heading levels', () => {
    render(<SectionHeader title="Repositories" counter={4} headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Repositories' })).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
