import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextInput, TextTextarea } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import { DEFAULT_SLICE_DAY, DEFAULT_SLICE_KONK } from '../lib/urlSearch.js';

type DiscoverItem = {
  productId: string;
  runs: Array<{ dateFromMs: number; dateToMs: number; peakStock: number }>;
};

type DiscoverResult = {
  konkName: string;
  items: DiscoverItem[];
};

function asDiscover(value: unknown): DiscoverResult | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as DiscoverResult;
  if (typeof v.konkName !== 'string' || !Array.isArray(v.items)) return null;
  return v;
}

export function BandSpikePage() {
  const [konk, setKonk] = useState(DEFAULT_SLICE_KONK);
  const [productIdsText, setProductIdsText] = useState('');
  const [dateFrom, setDateFrom] = useState(DEFAULT_SLICE_DAY);
  const [dateTo, setDateTo] = useState(DEFAULT_SLICE_DAY);
  const [stockMin, setStockMin] = useState('50');
  const [stockMax, setStockMax] = useState('99');
  const [normalMax, setNormalMax] = useState('20');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discover, setDiscover] = useState<DiscoverResult | null>(null);
  const [correctSummary, setCorrectSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productIds = productIdsText
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const discoverMutation = useMutation({
    mutationFn: () =>
      api.discoverBandSpike({
        konk,
        productIds,
        dateFrom,
        dateTo,
        stockMin: Number(stockMin),
        stockMax: Number(stockMax),
        normalMax: Number(normalMax),
      }),
    onSuccess: (raw) => {
      setError(null);
      setCorrectSummary(null);
      const parsed = asDiscover(raw);
      if (!parsed) {
        setError('Unexpected discover payload');
        return;
      }
      setDiscover(parsed);
      const first = parsed.items[0];
      if (first) setSelectedProductId(first.productId);
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Discover failed');
    },
  });

  const correctMutation = useMutation({
    mutationFn: (apply: boolean) =>
      api.correctBandSpike({
        konk,
        productId: selectedProductId,
        dateFrom,
        dateTo,
        band: {
          bandMin: Number(stockMin),
          bandMax: Number(stockMax),
          normalMax: Number(normalMax),
        },
        apply,
      }),
    onSuccess: (raw, apply) => {
      setError(null);
      const result = raw as { applied?: number; preview?: { patches?: unknown[] } };
      setCorrectSummary(
        apply
          ? `Applied ${result.applied ?? 0} patches`
          : `Preview patches: ${result.preview?.patches?.length ?? 0}`,
      );
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Correct failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Band-spike"
        description="Discover stock spikes in band → preview / correct"
      />

      <div className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-3">
        <Field label="konk">
          <TextInput value={konk} onChange={(e) => setKonk(e.target.value)} />
        </Field>
        <Field label="dateFrom">
          <TextInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </Field>
        <Field label="dateTo">
          <TextInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Field>
        <Field label="stockMin">
          <TextInput value={stockMin} onChange={(e) => setStockMin(e.target.value)} />
        </Field>
        <Field label="stockMax">
          <TextInput value={stockMax} onChange={(e) => setStockMax(e.target.value)} />
        </Field>
        <Field label="normalMax">
          <TextInput value={normalMax} onChange={(e) => setNormalMax(e.target.value)} />
        </Field>
        <div className="md:col-span-3">
          <Field label="productIds">
            <TextTextarea
              value={productIdsText}
              onChange={(e) => setProductIdsText(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={discoverMutation.isPending || productIds.length === 0}
          onClick={() => discoverMutation.mutate()}
        >
          Discover
        </Button>
        <Button
          disabled={!selectedProductId || correctMutation.isPending}
          onClick={() => correctMutation.mutate(false)}
        >
          Preview correct
        </Button>
        <Button
          variant="danger"
          disabled={!selectedProductId || correctMutation.isPending}
          onClick={() => correctMutation.mutate(true)}
        >
          Apply correct
        </Button>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {correctSummary ? <Banner tone="success">{correctSummary}</Banner> : null}

      {discover ? (
        <TableShell>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <Th>Product</Th>
              <Th>Runs</Th>
              <Th>Peak</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {discover.items.length === 0 ? (
              <tr>
                <Td colSpan={4}>No spikes found</Td>
              </tr>
            ) : (
              discover.items.map((item) => (
                <tr key={item.productId} className="border-t border-slate-100">
                  <Td className="font-mono text-xs">{item.productId}</Td>
                  <Td>{item.runs.length}</Td>
                  <Td className="font-mono">
                    {item.runs.map((r) => r.peakStock).join(', ') || '—'}
                  </Td>
                  <Td>
                    <Button onClick={() => setSelectedProductId(item.productId)}>Select</Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      ) : null}

      {selectedProductId ? (
        <Banner tone="info">
          Selected product <span className="font-mono">{selectedProductId}</span>
        </Banner>
      ) : null}
    </div>
  );
}
