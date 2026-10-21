import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Filter } from './Filter.js';
it('Filter renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Filter title="Filter" size={20} />);
  expect(markup).toContain('data-icon="Filter"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Filter</title>');
  expect(markup).toContain('width="20"');
});
