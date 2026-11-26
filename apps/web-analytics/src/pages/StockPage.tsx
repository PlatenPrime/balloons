import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { ApplyFiltersButton, ReportRangeFilters } from '../components/ReportFilters.js';
import { SeriesChart } from '../components/SeriesChart.js';
import { Banner } from '../components/ui/Banner.js';
import { buildSeriesQuery, readStockSeries } from '../lib/reportSeries.js';
import {
  parseReportRangeSearch,
  writeReportRangeSearch,
  type ReportRangeSearch,
} from '../lib/urlSearch.js';

export function StockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseReportRangeSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<ReportRangeSearch>(applied);

  const query = useQuery({
    queryKey: ['reports', 'stock-series', applied],
    queryFn: () => api.reportStockSeries(buildSeriesQuery(applied)),
  });

  const { days, summary } = readStockSeries(query.data);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock series"
        description="Stock over time for konk + prod"
        actions={
          <ApplyFiltersButton
            onClick={() => {
              setSearchParams(writeReportRangeSearch(draft));
            }}
          />
        }
      />

      <ReportRangeFilters value={draft} onChange={setDraft} />

      {summary ? <Banner tone="info">stockLast: {summary.stockLast}</Banner> : null}

      <QueryState isLoading={query.isLoading} error={query.error} isEmpty={!days.length}>
        <SeriesChart data={days} lines={[{ key: 'stock', color: '#0f172a', name: 'Stock' }]} />
      </QueryState>
    </div>
  );
}
