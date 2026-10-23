import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { GripVertical } from './GripVertical.js';
it('GripVertical renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<GripVertical title="GripVertical" size={20} />);
  expect(markup).toContain('data-icon="GripVertical"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>GripVertical</title>');
  expect(markup).toContain('width="20"');
});
