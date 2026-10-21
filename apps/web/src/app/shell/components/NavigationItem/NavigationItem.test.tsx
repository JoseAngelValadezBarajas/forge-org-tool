import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
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
