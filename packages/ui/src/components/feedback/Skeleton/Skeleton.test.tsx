import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';
describe('Skeleton', () => {
  it('is hidden from assistive technology while content is loading', () => {
    const { container } = render(<Skeleton label="Loading projects" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the canonical list skeleton composition', () => {
    const { container } = render(<Skeleton kind="list" />);
    expect(container.querySelectorAll('[data-skeleton-item]')).toHaveLength(3);
    expect(container.firstElementChild).toHaveAttribute('data-kind', 'list');
  });
});
