import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { ReportField } from './ReportField';
it('labels reported input without implying verification', () => {
  render(<ReportField label="Environment" value="Local" />);
  const field = screen.getByRole('group', { name: 'Environment' });
  expect(field).toHaveAttribute('data-state', 'HasValue');
  expect(field).toHaveTextContent('HAS VALUE');
  expect(field).toHaveTextContent('no assumed proof');
  expect(field).toHaveTextContent('Reported');
  expect(screen.getByText('Local')).toBeInTheDocument();
});

it('renders the canonical Empty state without a blank value line', () => {
  render(<ReportField label="Reported activity" value="" />);

  const field = screen.getByRole('group', { name: 'Reported activity' });
  expect(field).toHaveAttribute('data-state', 'Empty');
  expect(field).toHaveTextContent('EMPTY');
  expect(field).toHaveTextContent('Operator-reported notes and run result');
  expect(field.querySelector('strong')).toBeNull();
});
