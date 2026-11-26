/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client.js';
import { ClientIngestPanel } from './ClientIngestPanel.js';
import { ExtensionBridgeError, requestExtensionCapture } from './extensionBridge.js';
import { BRIDGE_SOURCE } from './extensionProtocol.js';

vi.mock('../../api/client.js', () => ({
  api: {
    listPending: vi.fn(),
    ingestHtml: vi.fn(),
  },
}));

vi.mock('./extensionBridge.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./extensionBridge.js')>();
  return {
    ...actual,
    requestExtensionCapture: vi.fn(),
  };
});

const pendingItem = {
  skuId: 'sku-1',
  productId: 'prod-1',
  title: 'Balloon A',
  url: 'https://example.com/product/1',
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ClientIngestPanel konkName="air" />, { wrapper });
}

describe('ClientIngestPanel (React integration)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(api.listPending).mockReset();
    vi.mocked(api.ingestHtml).mockReset();
    vi.mocked(requestExtensionCapture).mockReset();
    vi.mocked(api.listPending).mockResolvedValue({
      konkName: 'air',
      date: '2026-07-15T00:00:00.000Z',
      items: [pendingItem],
    });
  });

  it('renders pending rows and Capture controls', async () => {
    const { container } = renderPanel();
    const view = within(container);
    expect(await view.findByText('Balloon A')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Capture' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Capture via extension' })).toBeTruthy();
  });

  it('locks Capture buttons while mutation is in flight, then shows success banner', async () => {
    const user = userEvent.setup();
    let resolveCapture!: (value: unknown) => void;
    const pendingCapture = new Promise((resolve) => {
      resolveCapture = resolve;
    });
    vi.mocked(requestExtensionCapture).mockReturnValue(
      pendingCapture as ReturnType<typeof requestExtensionCapture>,
    );

    const { container } = renderPanel();
    const view = within(container);
    await user.click(await view.findByRole('button', { name: 'Capture' }));

    await waitFor(() => {
      expect(view.getByRole('button', { name: 'Capturing…' })).toBeTruthy();
    });
    expect((view.getByRole('button', { name: 'Capturing…' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (view.getByRole('button', { name: 'Capture via extension' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    resolveCapture({
      source: BRIDGE_SOURCE,
      type: 'CAPTURE_RESULT',
      requestId: 'req-1',
      ok: true,
      status: 'saved',
      productId: 'prod-1',
      stock: 4,
      price: 12,
      konk: 'air',
      skuId: 'sku-1',
    });

    await waitFor(() => {
      expect(view.getByText(/Capture saved: product prod-1/)).toBeTruthy();
    });
    expect((view.getByRole('button', { name: 'Capture' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(vi.mocked(requestExtensionCapture)).toHaveBeenCalledWith(
      expect.objectContaining({
        konk: 'air',
        skuId: 'sku-1',
        sourceUrl: pendingItem.url,
      }),
    );
  });

  it('shows error banner and unlocks Capture after extension failure', async () => {
    const user = userEvent.setup();
    vi.mocked(requestExtensionCapture).mockRejectedValue(
      new ExtensionBridgeError('TIMEOUT', 'Extension did not respond'),
    );

    const { container } = renderPanel();
    const view = within(container);
    await user.click(await view.findByRole('button', { name: 'Capture' }));

    await waitFor(() => {
      expect(view.getByText('TIMEOUT: Extension did not respond')).toBeTruthy();
    });
    expect((view.getByRole('button', { name: 'Capture' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('Use fills the paste form fields from the pending row', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    const view = within(container);
    await user.click(await view.findByRole('button', { name: 'Use' }));
    expect(view.getByDisplayValue('sku-1')).toBeTruthy();
    expect(view.getByDisplayValue(pendingItem.url)).toBeTruthy();
  });
});
