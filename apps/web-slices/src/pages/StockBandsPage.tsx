import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextInput } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import { parseCatalogListSearch, writeCatalogListSearch } from '../lib/urlSearch.js';

export function StockBandsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseCatalogListSearch(searchParams);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [konkName, setKonkName] = useState('air');
  const [konkTitle, setKonkTitle] = useState('Air');
  const [stockMin, setStockMin] = useState('50');
  const [stockMax, setStockMax] = useState('99');
  const [normalMax, setNormalMax] = useState('20');
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['catalog', 'stock-bands', filters.konkName],
    queryFn: () =>
      api.listStockBands(filters.konkName ? { konkName: filters.konkName } : undefined),
  });

  const seedMutation = useMutation({
    mutationFn: () =>
      api.seedStockBand({
        konk: { name: konkName, title: konkTitle },
        stockMin: Number(stockMin),
        stockMax: Number(stockMax),
        normalMax: Number(normalMax),
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'stock-bands'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Seed failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Stock bands" description="Anomalous stock bands CRUD" />

      <div className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-3">
        <Field label="konkName filter">
          <TextInput
            value={filters.konkName ?? ''}
            onChange={(e) => {
              const next = writeCatalogListSearch(
                e.target.value ? { konkName: e.target.value } : {},
              );
              setSearchParams(next);
            }}
          />
        </Field>
      </div>

      <QueryState
        isLoading={listQuery.isLoading}
        error={listQuery.error}
        isEmpty={listQuery.data?.items.length === 0}
      >
        {listQuery.data ? (
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>Id</Th>
                <Th>Konk</Th>
                <Th>Min</Th>
                <Th>Max</Th>
                <Th>Normal max</Th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => void navigate(`/stock-bands/${row.id}`)}
                >
                  <Td className="font-mono text-xs">
                    <Link className="underline" to={`/stock-bands/${row.id}`}>
                      {row.id}
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">{row.konk.name}</Td>
                  <Td className="font-mono">{row.stockMin}</Td>
                  <Td className="font-mono">{row.stockMax}</Td>
                  <Td className="font-mono">{row.normalMax}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}
      </QueryState>

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Create stock band</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="konk.name">
            <TextInput value={konkName} onChange={(e) => setKonkName(e.target.value)} />
          </Field>
          <Field label="konk.title">
            <TextInput value={konkTitle} onChange={(e) => setKonkTitle(e.target.value)} />
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
        </div>
        <Button
          variant="primary"
          disabled={!konkName || seedMutation.isPending}
          onClick={() => seedMutation.mutate()}
        >
          Create
        </Button>
        {error ? <Banner tone="error">{error}</Banner> : null}
      </section>
    </div>
  );
}
