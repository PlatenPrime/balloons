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
import { mapNamedSalesPie, type SalesPcsRow } from '../lib/reportPies.js';
import {
  parseProdDateRangeSearch,
  writeProdDateRangeSearch,
  type ProdDateRangeSearch,
} from '../lib/urlSearch.js';

type ProdKonksPie = {
  data: Record<string, SalesPcsRow>;
  all: SalesPcsRow;
};

export function ComparisonKonksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseProdDateRangeSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<ProdDateRangeSearch>(applied);

  const prodsQuery = useQuery({
    queryKey: ['catalog', 'prods'],
    queryFn: () => api.listProds(),
  });

  const query = useQuery({
    queryKey: ['reports', 'prod-konks-pie', applied],
    queryFn: () =>
      api.reportProdKonksPie({
        prod: applied.prod,
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
        ...(applied.excludeKonks ? { excludeKonks: applied.excludeKonks } : {}),
      }) as Promise<ProdKonksPie>,
  });

  const pieData = mapNamedSalesPie(query.data?.data).map((row) => ({
    name: row.name,
    value: row.value,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Comparison · konks"
        description="Peer konk pie for a manufacturer (never vs sharik/btrade)"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="text-sm text-sky-700 underline" to="/comparison/skus">
              SKU selection →
            </Link>
            <ApplyFiltersButton
              onClick={() => {
                setSearchParams(writeProdDateRangeSearch(draft));
              }}
            />
          </div>
        }
      />

      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Prod">
          <TextSelect
            value={draft.prod}
            onChange={(e) => setDraft({ ...draft, prod: e.target.value })}
          >
            {(prodsQuery.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.name}>
                {p.title} ({p.name})
              </option>
            ))}
          </TextSelect>
        </Field>
        <DateRangeFields
          dateFrom={draft.dateFrom}
          dateTo={draft.dateTo}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
        <Field label="Exclude konks" hint="CSV optional">
          <TextInput
            value={draft.excludeKonks ?? ''}
            onChange={(e) => {
              const excludeKonks = e.target.value;
              const next = { ...draft };
              if (excludeKonks) next.excludeKonks = excludeKonks;
              else delete next.excludeKonks;
              setDraft(next);
            }}
          />
        </Field>
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
        emptyMessage="No peer konk sales in range"
      >
        <PieChartCard data={pieData} />
      </QueryState>
    </div>
  );
}
