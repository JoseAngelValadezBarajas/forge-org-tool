import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Close } from './Close.js';
it('Close renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Close title="Close" size={20} />);
  expect(markup).toContain('data-icon="Close"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Close</title>');
  expect(markup).toContain('width="20"');
});
