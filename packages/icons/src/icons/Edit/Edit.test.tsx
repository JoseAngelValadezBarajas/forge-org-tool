import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Edit } from './Edit.js';
it('Edit renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Edit title="Edit" size={20} />);
  expect(markup).toContain('data-icon="Edit"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Edit</title>');
  expect(markup).toContain('width="20"');
});
