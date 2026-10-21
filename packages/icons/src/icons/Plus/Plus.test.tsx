import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Plus } from './Plus.js';

describe('Plus icon contract', () => {
  it('is decorative by default and inherits currentColor', () => {
    const markup = renderToStaticMarkup(<Plus />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('currentColor');
    expect(markup).not.toContain('<title');
  });

  it('exposes an accessible name when given a title', () => {
    const markup = renderToStaticMarkup(<Plus title="Add item" />);
    expect(markup).toContain('>Add item</title>');
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain('aria-hidden="true"');
  });

  it('supports typed sizing and forwarded SVG attributes', () => {
    const markup = renderToStaticMarkup(<Plus size={18} data-testid="plus-icon" />);
    expect(markup).toContain('width="18"');
    expect(markup).toContain('height="18"');
    expect(markup).toContain('data-testid="plus-icon"');
  });

  it('uses unique title ids for multiple named instances', () => {
    const markup = renderToStaticMarkup(
      <>
        <Plus title="First" />
        <Plus title="Second" />
      </>,
    );
    const ids = [...markup.matchAll(/<title id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
