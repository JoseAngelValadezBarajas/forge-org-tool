import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Tabs } from './Tabs';
describe('Tabs', () => {
  it('links tab selection to its panel and supports arrow-key movement', () => {
    render(
      <Tabs
        tabs={[
          { id: 'one', label: 'One', content: 'First panel' },
          { id: 'two', label: 'Two', content: 'Second panel' },
        ]}
      />,
    );
    const one = screen.getByRole('tab', { name: 'One' });
    one.focus();
    fireEvent.keyDown(one, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Second panel');
  });
});
