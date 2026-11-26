import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { ReportRangeSearch } from '../lib/urlSearch.js';
import { Button } from './ui/Button.js';
import { Field, TextInput, TextSelect } from './ui/Field.js';

export function ReportRangeFilters({
  value,
  onChange,
  showSkugr = true,
}: {
  value: ReportRangeSearch;
  onChange: (next: ReportRangeSearch) => void;
  showSkugr?: boolean;
}) {
  const konksQuery = useQuery({
    queryKey: ['catalog', 'konks'],
    queryFn: () => api.listKonks(),
  });
  const prodsQuery = useQuery({
    queryKey: ['catalog', 'prods'],
    queryFn: () => api.listProds(),
  });
  const skugrsQuery = useQuery({
    queryKey: ['catalog', 'skugrs', value.konk],
    queryFn: () => api.listSkugrs({ konkName: value.konk }),
    enabled: showSkugr,
  });

  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Konk">
        <TextSelect
          value={value.konk}
          onChange={(e) => onChange({ ...value, konk: e.target.value })}
        >
          {(konksQuery.data?.items ?? []).map((k) => (
            <option key={k.id} value={k.name}>
              {k.title} ({k.name})
            </option>
          ))}
          {!konksQuery.data?.items.some((k) => k.name === value.konk) ? (
            <option value={value.konk}>{value.konk}</option>
          ) : null}
        </TextSelect>
      </Field>
      <Field label="Prod">
        <TextSelect
          value={value.prod}
          onChange={(e) => onChange({ ...value, prod: e.target.value })}
        >
          {(prodsQuery.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.name}>
              {p.title} ({p.name})
            </option>
          ))}
          {!prodsQuery.data?.items.some((p) => p.name === value.prod) ? (
            <option value={value.prod}>{value.prod}</option>
          ) : null}
        </TextSelect>
      </Field>
      <Field label="From">
        <TextInput
          type="date"
          value={value.dateFrom}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        />
      </Field>
      <Field label="To">
        <TextInput
          type="date"
          value={value.dateTo}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        />
      </Field>
      {showSkugr ? (
        <Field label="Skugr (optional)" hint="CSV of skugr ids">
          <TextSelect
            value={value.skugrIds ?? ''}
            onChange={(e) => {
              const skugrIds = e.target.value;
              const next = { ...value };
              if (skugrIds) next.skugrIds = skugrIds;
              else delete next.skugrIds;
              onChange(next);
            }}
          >
            <option value="">All (rollup)</option>
            {(skugrsQuery.data?.items ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </TextSelect>
        </Field>
      ) : null}
    </div>
  );
}

export function DateRangeFields({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (patch: { dateFrom?: string; dateTo?: string }) => void;
}) {
  return (
    <>
      <Field label="From">
        <TextInput
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
        />
      </Field>
      <Field label="To">
        <TextInput
          type="date"
          value={dateTo}
          onChange={(e) => onChange({ dateTo: e.target.value })}
        />
      </Field>
    </>
  );
}

export function ApplyFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" onClick={onClick}>
      Apply
    </Button>
  );
}
