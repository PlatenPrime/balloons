import { describe, expect, it } from 'vitest';
import { normalizeUrl, urlsMatch } from './urls.js';

describe('urls', () => {
  it('normalizes trim, trailing slash, and case', () => {
    expect(normalizeUrl(' https://Example.com/Product/1/ ')).toBe('https://example.com/product/1');
  });

  it('matches equivalent URLs', () => {
    expect(urlsMatch('https://example.com/product/1/', 'HTTPS://EXAMPLE.COM/product/1')).toBe(true);
    expect(urlsMatch('https://example.com/a', 'https://example.com/b')).toBe(false);
  });
});
