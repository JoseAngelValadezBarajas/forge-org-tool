import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChevronDown } from './ChevronDown.js';
it('ChevronDown renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<ChevronDown title="ChevronDown" size={20} />);
  expect(markup).toContain('data-icon="ChevronDown"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>ChevronDown</title>');
  expect(markup).toContain('width="20"');
});
