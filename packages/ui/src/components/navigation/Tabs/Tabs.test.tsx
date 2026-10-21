import { cleanup, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs } from './Tabs';
afterEach(cleanup);
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

  it('falls back to the first enabled tab when the requested tab is disabled', () => {
    render(
      <Tabs
        defaultValue="disabled"
        tabs={[
          { id: 'disabled', label: 'Unavailable', content: 'Unavailable panel', disabled: true },
          { id: 'available', label: 'Available', content: 'Available panel' },
          { id: 'next', label: 'Next', content: 'Next panel' },
        ]}
      />,
    );

    const available = screen.getByRole('tab', { name: 'Available' });
    expect(available).toHaveAttribute('aria-selected', 'true');
    expect(available).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Available panel');

    available.focus();
    fireEvent.keyDown(available, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Next' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Next' })).toHaveFocus();
  });

  it('renders an inert tablist without an active panel when every tab is disabled', () => {
    render(
      <Tabs
        tabs={[
          { id: 'one', label: 'One', content: 'First panel', disabled: true },
          { id: 'two', label: 'Two', content: 'Second panel', disabled: true },
        ]}
      />,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    for (const tab of tabs) expect(tab).toBeDisabled();
    expect(screen.queryByRole('tab', { selected: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });
});
