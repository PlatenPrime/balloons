import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { PieChartCard } from '../components/PieChartCard.js';
import { QueryState } from '../components/QueryState.js';
import { ApplyFiltersButton, DateRangeFields } from '../components/ReportFilters.js';
import { Banner } from '../components/ui/Banner.js';
import { Field, TextSelect } from '../components/ui/Field.js';
import { mapNamedSalesPie, type SalesPcsRow } from '../lib/reportPies.js';
import {
  parseKonkDateRangeSearch,
  writeKonkDateRangeSearch,
  type KonkDateRangeSearch,
} from '../lib/urlSearch.js';

type ManufacturersPie = {
  data: Record<string, SalesPcsRow>;
  all: SalesPcsRow;
};

export function StatisticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseKonkDateRangeSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<KonkDateRangeSearch>(applied);

  const konksQuery = useQuery({
    queryKey: ['catalog', 'konks'],
    queryFn: () => api.listKonks(),
  });

  const query = useQuery({
    queryKey: ['reports', 'manufacturers-pie', applied],
    queryFn: () =>
      api.reportManufacturersPie({
        konk: applied.konk,
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
      }) as Promise<ManufacturersPie>,
  });

  const pieData = mapNamedSalesPie(query.data?.data).map((row) => ({
    name: row.name,
    value: row.value,
    prodName: row.key,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statistics"
        description="Manufacturer pie for a konk · drill into prod"
        actions={
          <ApplyFiltersButton
            onClick={() => {
              setSearchParams(writeKonkDateRangeSearch(draft));
            }}
          />
        }
      />

      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Field label="Konk">
          <TextSelect
            value={draft.konk}
            onChange={(e) => setDraft({ ...draft, konk: e.target.value })}
          >
            {(konksQuery.data?.items ?? []).map((k) => (
              <option key={k.id} value={k.name}>
                {k.title} ({k.name})
              </option>
            ))}
          </TextSelect>
        </Field>
        <DateRangeFields
          dateFrom={draft.dateFrom}
          dateTo={draft.dateTo}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
      </div>

      {query.data ? (
        <Banner tone="info">
          All salesPcs: {query.data.all.salesPcs} · salesUah: {query.data.all.salesUah}
        </Banner>
      ) : null}

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={pieData.length === 0}
        emptyMessage="No manufacturer sales in range"
      >
        <PieChartCard data={pieData} />
        <ul className="space-y-1 text-sm">
          {pieData.map((row) => (
            <li key={row.prodName}>
              <Link
                className="text-sky-700 underline"
                to={`/statistics/prod?konk=${encodeURIComponent(applied.konk)}&prod=${encodeURIComponent(row.prodName)}&dateFrom=${encodeURIComponent(applied.dateFrom)}&dateTo=${encodeURIComponent(applied.dateTo)}`}
              >
                {row.name}: {row.value} pcs
              </Link>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
