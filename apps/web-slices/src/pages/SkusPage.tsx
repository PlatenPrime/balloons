import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextInput, TextSelect } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import {
  parseCatalogListSearch,
  patchCatalogListSearch,
  writeCatalogListSearch,
} from '../lib/urlSearch.js';

export function SkusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseCatalogListSearch(searchParams);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [konkName, setKonkName] = useState('air');
  const [prodName, setProdName] = useState('');
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['catalog', 'skus', filters],
    queryFn: () =>
      api.listSkus({
        ...(filters.konkName ? { konkName: filters.konkName } : {}),
        ...(filters.isInvalid !== undefined ? { isInvalid: filters.isInvalid } : {}),
      }),
  });

  const seedMutation = useMutation({
    mutationFn: () =>
      api.seedSku({
        konkName,
        prodName,
        productId,
        title,
      }),
    onSuccess: async () => {
      setError(null);
      setTitle('');
      setProductId('');
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'skus'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Seed failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Competitor SKUs" description="Catalog SKUs" />

      <div className="flex flex-wrap items-end gap-3 border border-slate-200 bg-white p-3">
        <Field label="konkName">
          <TextInput
            value={filters.konkName ?? ''}
            onChange={(e) =>
              setSearchParams(
                writeCatalogListSearch(
                  patchCatalogListSearch(filters, {
                    konkName: e.target.value ? e.target.value : null,
                  }),
                ),
              )
            }
          />
        </Field>
        <Field label="isInvalid">
          <TextSelect
            value={filters.isInvalid === undefined ? '' : filters.isInvalid ? 'true' : 'false'}
            onChange={(e) => {
              const raw = e.target.value;
              setSearchParams(
                writeCatalogListSearch(
                  patchCatalogListSearch(filters, {
                    isInvalid: raw === '' ? null : raw === 'true',
                  }),
                ),
              );
            }}
          >
            <option value="">any</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </TextSelect>
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
                <Th>Product</Th>
                <Th>Title</Th>
                <Th>Invalid</Th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.items.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => void navigate(`/skus/${row.id}`)}
                >
                  <Td className="font-mono text-xs">
                    <Link to={`/skus/${row.id}`} className="underline">
                      {row.id}
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">{row.konkName}</Td>
                  <Td className="font-mono text-xs">{row.productId}</Td>
                  <Td>{row.title}</Td>
                  <Td>{String(row.isInvalid)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}
      </QueryState>

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Seed SKU</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="konkName">
            <TextInput value={konkName} onChange={(e) => setKonkName(e.target.value)} />
          </Field>
          <Field label="prodName">
            <TextInput value={prodName} onChange={(e) => setProdName(e.target.value)} />
          </Field>
          <Field label="productId">
            <TextInput value={productId} onChange={(e) => setProductId(e.target.value)} />
          </Field>
          <Field label="title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </div>
        <Button
          variant="primary"
          disabled={!konkName || !prodName || !productId || !title || seedMutation.isPending}
          onClick={() => seedMutation.mutate()}
        >
          Seed
        </Button>
        {error ? <Banner tone="error">{error}</Banner> : null}
      </section>
    </div>
  );
}
