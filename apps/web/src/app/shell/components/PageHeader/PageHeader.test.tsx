import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { PageHeader } from './PageHeader';
it('groups page title, context and actions in a labelled header', () => {
  render(
    <PageHeader eyebrow="FORGE" title="Workspace">
      <button>Open command palette</button>
    </PageHeader>,
  );
  expect(screen.getByRole('banner', { name: 'Workspace' })).toHaveTextContent('FORGE');
  expect(screen.getByRole('heading', { name: 'Workspace' })).toBeInTheDocument();
});
