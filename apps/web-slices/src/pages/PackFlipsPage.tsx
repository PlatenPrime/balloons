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

type PackFlipPreview = {
  konkName: string;
  items: Array<{ productId: string; decisions: unknown[] }>;
};

type PackFlipApply = {
  konkName: string;
  applied: number;
  skipped: number;
};

function asPreview(value: unknown): PackFlipPreview | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as PackFlipPreview;
  if (typeof v.konkName !== 'string' || !Array.isArray(v.items)) return null;
  return v;
}

function asApply(value: unknown): PackFlipApply | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as PackFlipApply;
  if (
    typeof v.konkName !== 'string' ||
    typeof v.applied !== 'number' ||
    typeof v.skipped !== 'number'
  ) {
    return null;
  }
  return v;
}

export function PackFlipsPage() {
  const [konk, setKonk] = useState(DEFAULT_SLICE_KONK);
  const [productIdsText, setProductIdsText] = useState('');
  const [dateFrom, setDateFrom] = useState(DEFAULT_SLICE_DAY);
  const [dateTo, setDateTo] = useState(DEFAULT_SLICE_DAY);
  const [preview, setPreview] = useState<PackFlipPreview | null>(null);
  const [applyResult, setApplyResult] = useState<PackFlipApply | null>(null);
  const [error, setError] = useState<string | null>(null);

  const body = () => ({
    konk,
    productIds: productIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    dateFrom,
    dateTo,
  });

  const previewMutation = useMutation({
    mutationFn: () => api.previewPackFlips(body()),
    onSuccess: (raw) => {
      setError(null);
      setApplyResult(null);
      const parsed = asPreview(raw);
      if (!parsed) {
        setError('Unexpected preview payload');
        return;
      }
      setPreview(parsed);
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Preview failed');
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => api.applyPackFlips(body()),
    onSuccess: (raw) => {
      setError(null);
      const parsed = asApply(raw);
      if (!parsed) {
        setError('Unexpected apply payload');
        return;
      }
      setApplyResult(parsed);
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Apply failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Pack-flips" description="Preview pack-flip range → apply corrections" />

      <div className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-2">
        <Field label="konk">
          <TextInput value={konk} onChange={(e) => setKonk(e.target.value)} />
        </Field>
        <Field label="productIds" hint="comma / whitespace separated">
          <TextTextarea
            value={productIdsText}
            onChange={(e) => setProductIdsText(e.target.value)}
            className="min-h-20"
          />
        </Field>
        <Field label="dateFrom">
          <TextInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </Field>
        <Field label="dateTo">
          <TextInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={previewMutation.isPending || body().productIds.length === 0}
          onClick={() => previewMutation.mutate()}
        >
          Preview
        </Button>
        <Button
          disabled={applyMutation.isPending || body().productIds.length === 0}
          onClick={() => applyMutation.mutate()}
        >
          Apply
        </Button>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}
      {applyResult ? (
        <Banner tone="success">
          Applied {applyResult.applied}, skipped {applyResult.skipped} ({applyResult.konkName})
        </Banner>
      ) : null}

      {preview ? (
        <TableShell>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <Th>Product</Th>
              <Th>Decisions</Th>
            </tr>
          </thead>
          <tbody>
            {preview.items.length === 0 ? (
              <tr>
                <Td colSpan={2}>No pack-flip decisions in range</Td>
              </tr>
            ) : (
              preview.items.map((item) => (
                <tr key={item.productId} className="border-t border-slate-100">
                  <Td className="font-mono text-xs">{item.productId}</Td>
                  <Td className="font-mono text-xs">{item.decisions.length}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      ) : null}
    </div>
  );
}
