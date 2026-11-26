import { describe, expect, it, vi } from 'vitest';
import { respondAsync } from './respondAsync.js';

describe('respondAsync', () => {
  it('forwards resolved values to sendResponse', async () => {
    const sendResponse = vi.fn();
    respondAsync(sendResponse, Promise.resolve({ ok: true }), () => ({ ok: false }));
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ ok: true }));
  });

  it('maps rejections through onReject so the listener always responds', async () => {
    const sendResponse = vi.fn();
    respondAsync(sendResponse, Promise.reject(new Error('boom')), (err) => ({
      ok: false,
      message: err instanceof Error ? err.message : 'fail',
    }));
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith({ ok: false, message: 'boom' }),
    );
  });
});
