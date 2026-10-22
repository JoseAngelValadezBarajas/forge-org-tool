import { describe, expect, it } from 'vitest';
import { repositoryDisplayName } from './repositoryDisplayName';

describe('repositoryDisplayName', () => {
  it('returns the final path segment across POSIX and Windows separators', () => {
    expect(repositoryDisplayName('/home/synthetic/forge-core/')).toBe('forge-core');
    expect(repositoryDisplayName('C:\\synthetic\\forge-core\\')).toBe('forge-core');
  });
});
