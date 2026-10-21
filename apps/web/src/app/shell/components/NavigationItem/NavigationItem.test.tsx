import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, it } from 'vitest';
import { NavigationItem } from './NavigationItem';
it('uses route-aware current-page semantics', () => {
  render(
    <MemoryRouter initialEntries={['/projects']}>
      <NavigationItem to="/projects" label="Projects" />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
});

it('renders disabled navigation as an inaccessible-to-activation item', () => {
  function CurrentLocation() {
    return <output>{useLocation().pathname}</output>;
  }

  const { container } = render(
    <MemoryRouter initialEntries={['/']}>
      <NavigationItem to="/projects" label="Projects" disabled />
      <CurrentLocation />
    </MemoryRouter>,
  );

  const item = container.querySelector('[aria-disabled], a') as HTMLElement;
  expect(item).toHaveAttribute('aria-disabled', 'true');
  expect(item.closest('a')).toBeNull();
  expect(item).not.toHaveAttribute('tabindex');

  fireEvent.click(item);
  fireEvent.keyDown(item, { key: 'Enter' });

  expect(screen.getByRole('status')).toHaveTextContent('/');
});
