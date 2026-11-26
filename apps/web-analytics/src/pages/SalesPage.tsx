import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { ApplyFiltersButton, ReportRangeFilters } from '../components/ReportFilters.js';
import { SeriesChart } from '../components/SeriesChart.js';
import { Banner } from '../components/ui/Banner.js';
import { buildSeriesQuery, readSalesSeries } from '../lib/reportSeries.js';
import {
  parseReportRangeSearch,
  writeReportRangeSearch,
  type ReportRangeSearch,
} from '../lib/urlSearch.js';

export function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseReportRangeSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<ReportRangeSearch>(applied);

  const query = useQuery({
    queryKey: ['reports', 'sales-series', applied],
    queryFn: () => api.reportSalesSeries(buildSeriesQuery(applied)),
  });

  const { days, summary } = readSalesSeries(query.data);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales series"
        description="Konk + prod rollup (optional skugr filter)"
        actions={
          <ApplyFiltersButton
            onClick={() => {
              setSearchParams(writeReportRangeSearch(draft));
            }}
          />
        }
      />

      <ReportRangeFilters value={draft} onChange={setDraft} />

      {summary ? (
        <Banner tone="info">
          Total salesPcs: {summary.salesPcs} · salesUah: {summary.salesUah}
        </Banner>
      ) : null}

      <QueryState isLoading={query.isLoading} error={query.error} isEmpty={!days.length}>
        <SeriesChart
          data={days}
          lines={[
            { key: 'sales', color: '#0f172a', name: 'Sales pcs' },
            { key: 'revenue', color: '#0369a1', name: 'Revenue' },
          ]}
        />
      </QueryState>
    </div>
  );
}
