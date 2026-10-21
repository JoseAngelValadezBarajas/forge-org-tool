import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Check } from './Check.js';
it('Check renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Check title="Check" size={20} />);
  expect(markup).toContain('data-icon="Check"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Check</title>');
  expect(markup).toContain('width="20"');
});
