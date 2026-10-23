import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Trash } from './Trash.js';
it('Trash renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Trash title="Trash" size={20} />);
  expect(markup).toContain('data-icon="Trash"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Trash</title>');
  expect(markup).toContain('width="20"');
});
