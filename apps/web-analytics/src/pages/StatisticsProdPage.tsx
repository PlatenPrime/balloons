import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { ApplyFiltersButton, ReportRangeFilters } from '../components/ReportFilters.js';
import { Banner } from '../components/ui/Banner.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';
import {
  parseReportRangeSearch,
  writeReportRangeSearch,
  type ReportRangeSearch,
} from '../lib/urlSearch.js';

type GroupsResponse = {
  data: Array<{ skugrId: string; title: string; salesPcs: number; salesUah: number }>;
  all: { title: string; salesPcs: number; salesUah: number };
};

export function StatisticsProdPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => parseReportRangeSearch(searchParams), [searchParams]);
  const [draft, setDraft] = useState<ReportRangeSearch>(applied);

  const query = useQuery({
    queryKey: ['reports', 'konk-prod-groups', applied],
    queryFn: () =>
      api.reportKonkProdGroups({
        konk: applied.konk,
        prod: applied.prod,
        dateFrom: applied.dateFrom,
        dateTo: applied.dateTo,
      }) as Promise<GroupsResponse | null>,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Statistics · prod"
        description="Skugr groups for konk + manufacturer"
        actions={
          <ApplyFiltersButton
            onClick={() => {
              setSearchParams(writeReportRangeSearch(draft));
            }}
          />
        }
      />

      <ReportRangeFilters value={draft} onChange={setDraft} showSkugr={false} />

      {query.data ? (
        <Banner tone="info">
          All salesPcs: {query.data.all.salesPcs} · salesUah: {query.data.all.salesUah}
        </Banner>
      ) : null}

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={!query.data?.data.length}
        emptyMessage="No skugr groups / null resolve"
      >
        {query.data ? (
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>Group</Th>
                <Th>salesPcs</Th>
                <Th>salesUah</Th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((row) => (
                <tr key={row.skugrId} className="border-t border-slate-100">
                  <Td>
                    <Link
                      className="text-sky-700 underline"
                      to={`/statistics/skugr?skugrId=${encodeURIComponent(row.skugrId)}&dateFrom=${encodeURIComponent(applied.dateFrom)}&dateTo=${encodeURIComponent(applied.dateTo)}`}
                    >
                      {row.title}
                    </Link>
                  </Td>
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
