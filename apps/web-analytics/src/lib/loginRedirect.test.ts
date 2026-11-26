import { describe, expect, it } from 'vitest';
import { resolveLoginRedirect } from './loginRedirect.js';

describe('resolveLoginRedirect', () => {
  it('uses fallback when state is missing or invalid', () => {
    expect(resolveLoginRedirect(undefined)).toBe('/sales');
    expect(resolveLoginRedirect(null)).toBe('/sales');
    expect(resolveLoginRedirect({ other: 1 })).toBe('/sales');
    expect(resolveLoginRedirect({ from: 1 })).toBe('/sales');
  });

  it('returns from path when present', () => {
    expect(resolveLoginRedirect({ from: '/excel' })).toBe('/excel');
    expect(resolveLoginRedirect({ from: '/statistics' }, '/sales')).toBe('/statistics');
  });

  it('rejects login path and empty from', () => {
    expect(resolveLoginRedirect({ from: '/login' })).toBe('/sales');
    expect(resolveLoginRedirect({ from: '' })).toBe('/sales');
  });
});
