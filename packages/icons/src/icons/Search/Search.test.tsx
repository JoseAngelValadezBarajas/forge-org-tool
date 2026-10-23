import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Search } from './Search.js';
it('Search renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Search title="Search" size={20} />);
  expect(markup).toContain('data-icon="Search"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Search</title>');
  expect(markup).toContain('width="20"');
});
