import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Table } from './Table';
describe('Table', () => {
  it('renders accessible column headers and empty state', () => {
    render(
      <Table
        caption="Repositories"
        columns={[{ key: 'name', label: 'Name' }]}
        rows={[]}
        emptyMessage="No repositories"
      />,
    );
    expect(screen.getByRole('table', { name: 'Repositories' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('No repositories')).toBeInTheDocument();
  });
});
