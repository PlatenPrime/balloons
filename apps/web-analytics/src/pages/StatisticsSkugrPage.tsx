import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { ApplyFiltersButton, DateRangeFields } from '../components/ReportFilters.js';
import { SeriesChart } from '../components/SeriesChart.js';
import { Banner } from '../components/ui/Banner.js';
import { Field, TextInput, TextSelect } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import {
  parseSkugrDrillSearch,
  writeSkugrDrillSearch,
  type SkugrDrillSearch,
} from '../lib/urlSearch.js';

type SkusSales = {
  skugrTitle: string;
  data: Array<{ skuId: string; title: string; salesPcs: number; salesUah: number }>;
  all: { title: string; salesPcs: number; salesUah: number };
};

export function StatisticsSkugrPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseSkugrDrillSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<SkugrDrillSearch>(applied);

  const skugrsQuery = useQuery({
    queryKey: ['catalog', 'skugrs'],
    queryFn: () => api.listSkugrs(),
  });

  const dailyQuery = useQuery({
    queryKey: ['reports', 'skugr-daily', applied],
    queryFn: () =>
      api.reportSkugrDaily({
        skugrId: applied.skugrId,
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
      }) as Promise<Array<{ date: string; stock: number; sales: number; revenue: number }> | null>,
    enabled: applied.skugrId.length > 0,
  });

  const skusQuery = useQuery({
    queryKey: ['reports', 'skugr-skus-sales', applied],
    queryFn: () =>
      api.reportSkugrSkusSales({
        skugrId: applied.skugrId,
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
      }) as Promise<SkusSales | null>,
    enabled: applied.skugrId.length > 0,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statistics · skugr"
        description="Daily series + SKU share for a group"
        actions={
          <ApplyFiltersButton
            onClick={() => {
              setSearchParams(writeSkugrDrillSearch(draft));
            }}
          />
        }
      />

      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Field label="Skugr">
          {skugrsQuery.data?.items.length ? (
            <TextSelect
              value={draft.skugrId}
              onChange={(e) => setDraft({ ...draft, skugrId: e.target.value })}
            >
              <option value="">Select…</option>
              {skugrsQuery.data.items.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </TextSelect>
          ) : (
            <TextInput
              value={draft.skugrId}
              onChange={(e) => setDraft({ ...draft, skugrId: e.target.value })}
              placeholder="skugr id"
            />
          )}
        </Field>
        <DateRangeFields
          dateFrom={draft.dateFrom}
          dateTo={draft.dateTo}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
      </div>

      {!applied.skugrId ? <Banner tone="warn">Pick a skugr to load drill reports.</Banner> : null}

      {skusQuery.data ? (
        <Banner tone="info">
          {skusQuery.data.skugrTitle}: salesPcs {skusQuery.data.all.salesPcs} · salesUah{' '}
          {skusQuery.data.all.salesUah}
        </Banner>
      ) : null}

      <QueryState
        isLoading={dailyQuery.isLoading}
        error={dailyQuery.error}
        isEmpty={!dailyQuery.data?.length}
        emptyMessage="No daily rows"
      >
        {dailyQuery.data ? (
          <SeriesChart
            data={dailyQuery.data.map((d) => ({
              date: d.date,
              stock: d.stock,
              sales: d.sales,
              revenue: d.revenue,
            }))}
            lines={[
              { key: 'sales', color: '#0f172a', name: 'Sales' },
              { key: 'stock', color: '#64748b', name: 'Stock' },
            ]}
          />
        ) : null}
      </QueryState>

      <QueryState
        isLoading={skusQuery.isLoading}
        error={skusQuery.error}
        isEmpty={!skusQuery.data?.data.length}
        emptyMessage="No SKU totals"
      >
        {skusQuery.data ? (
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>SKU</Th>
                <Th>salesPcs</Th>
                <Th>salesUah</Th>
              </tr>
            </thead>
            <tbody>
              {skusQuery.data.data.map((row) => (
                <tr key={row.skuId} className="border-t border-slate-100">
                  <Td>{row.title}</Td>
                  <Td>{row.salesPcs}</Td>
                  <Td>{row.salesUah}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}
      </QueryState>
    </div>
  );
}
