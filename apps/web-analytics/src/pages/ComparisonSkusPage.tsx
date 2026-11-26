import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { PieChartCard } from '../components/PieChartCard.js';
import { QueryState } from '../components/QueryState.js';
import { ApplyFiltersButton, DateRangeFields } from '../components/ReportFilters.js';
import { Banner } from '../components/ui/Banner.js';
import { Field, TextInput, TextSelect } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import {
  buildSelectionPieQuery,
  canQuerySelectionPie,
  mapSelectionPie,
  type SelectionPieRow,
} from '../lib/reportPies.js';
import {
  parseSelectionPieSearch,
  writeSelectionPieSearch,
  type SelectionPieSearch,
} from '../lib/urlSearch.js';

type SelectionPie = {
  data: Record<string, SelectionPieRow>;
  all: { title: string; salesPcs: number; salesUah: number };
};

export function ComparisonSkusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseSelectionPieSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<SelectionPieSearch>(applied);

  const konksQuery = useQuery({
    queryKey: ['catalog', 'konks'],
    queryFn: () => api.listKonks(),
  });
  const prodsQuery = useQuery({
    queryKey: ['catalog', 'prods'],
    queryFn: () => api.listProds(),
  });

  const canQuery = canQuerySelectionPie(applied);

  const query = useQuery({
    queryKey: ['reports', 'selection-pie', applied],
    queryFn: () => api.reportSelectionPie(buildSelectionPieQuery(applied)) as Promise<SelectionPie>,
    enabled: canQuery,
  });

  const rows = mapSelectionPie(query.data?.data);
  const pieData = rows.map((r) => ({ name: r.pieName, value: r.pieValue }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Comparison · skus"
        description="Selected competitor SKUs share"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="text-sm text-sky-700 underline" to="/comparison/konks">
              ← Konks
            </Link>
            <ApplyFiltersButton
              onClick={() => {
                setSearchParams(writeSelectionPieSearch(draft));
              }}
            />
          </div>
        }
      />

      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <DateRangeFields
          dateFrom={draft.dateFrom}
          dateTo={draft.dateTo}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
        <Field label="Mode">
          <TextSelect
            value={draft.selectAll ? 'all' : 'ids'}
            onChange={(e) => {
              const selectAll = e.target.value === 'all';
              const next = { ...draft, selectAll };
              if (selectAll) delete next.skuIds;
              setDraft(next);
            }}
          >
            <option value="all">selectAll</option>
            <option value="ids">skuIds CSV</option>
          </TextSelect>
        </Field>
        {!draft.selectAll ? (
          <Field label="skuIds" hint="CSV">
            <TextInput
              value={draft.skuIds ?? ''}
              onChange={(e) => {
                const skuIds = e.target.value;
                const next = { ...draft };
                if (skuIds) next.skuIds = skuIds;
                else delete next.skuIds;
                setDraft(next);
              }}
            />
          </Field>
        ) : null}
        <Field label="Konk filter">
          <TextSelect
            value={draft.konkName ?? ''}
            onChange={(e) => {
              const konkName = e.target.value;
              const next = { ...draft };
              if (konkName) next.konkName = konkName;
              else delete next.konkName;
              setDraft(next);
            }}
          >
            <option value="">Any</option>
            {(konksQuery.data?.items ?? []).map((k) => (
              <option key={k.id} value={k.name}>
                {k.name}
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Prod filter">
          <TextSelect
            value={draft.prodName ?? ''}
            onChange={(e) => {
              const prodName = e.target.value;
              const next = { ...draft };
              if (prodName) next.prodName = prodName;
              else delete next.prodName;
              setDraft(next);
            }}
          >
            <option value="">Any</option>
            {(prodsQuery.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Search">
          <TextInput
            value={draft.search ?? ''}
            onChange={(e) => {
              const search = e.target.value;
              const next = { ...draft };
              if (search) next.search = search;
              else delete next.search;
              setDraft(next);
            }}
          />
        </Field>
      </div>

      {!canQuery ? (
        <Banner tone="warn">Enable selectAll or provide skuIds, then Apply.</Banner>
      ) : null}

      {query.data ? (
        <Banner tone="info">
          All salesPcs: {query.data.all.salesPcs} · salesUah: {query.data.all.salesUah}
        </Banner>
      ) : null}

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={rows.length === 0}
        emptyMessage="No selection totals"
      >
        <PieChartCard data={pieData} />
        <TableShell>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <Th>SKU</Th>
              <Th>salesPcs</Th>
              <Th>sharePcs</Th>
              <Th>salesUah</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.skuId} className="border-t border-slate-100">
                <Td>{row.title}</Td>
                <Td>{row.salesPcs}</Td>
                <Td>{(row.sharePcs * 100).toFixed(1)}%</Td>
                <Td>{row.salesUah}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </QueryState>
    </div>
  );
}
