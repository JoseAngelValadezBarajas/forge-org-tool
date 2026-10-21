import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { TableRow } from './TableRow';
describe('TableRow', () => {
  it('renders header cells with column scope', () => {
    render(
      <table>
        <thead>
          <TableRow header cells={['Name', 'Status']} />
        </thead>
      </table>,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('scope', 'col');
  });
});
