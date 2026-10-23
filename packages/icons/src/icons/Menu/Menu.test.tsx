import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Menu } from './Menu.js';
it('Menu renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Menu title="Menu" size={20} />);
  expect(markup).toContain('data-icon="Menu"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Menu</title>');
  expect(markup).toContain('width="20"');
});
