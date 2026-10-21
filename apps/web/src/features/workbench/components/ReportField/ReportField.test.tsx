import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { ReportField } from './ReportField';
it('labels reported input without implying verification', () => {
  render(<ReportField label="Environment" value="Local" />);
  expect(screen.getByRole('group', { name: 'Environment' })).toHaveTextContent('Reported');
  expect(screen.getByText('Local')).toBeInTheDocument();
});
