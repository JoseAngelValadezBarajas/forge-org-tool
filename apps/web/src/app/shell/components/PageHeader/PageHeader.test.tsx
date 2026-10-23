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

it('composes the shared breadcrumb navigation when the Breadcrumbs variant is requested', () => {
  render(
    <PageHeader
      eyebrow="FORGE"
      title="Feature detail"
      breadcrumbs={[
        { label: 'Workspace', href: '/' },
        { label: 'Planning', href: '/planning' },
        { label: 'Feature detail' },
      ]}
    />,
  );

  expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Planning' })).toHaveAttribute('href', '/planning');
  expect(
    screen.getByText('Feature detail', { selector: '[aria-current="page"]' }),
  ).toBeInTheDocument();
});
