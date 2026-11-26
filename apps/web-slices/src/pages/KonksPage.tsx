import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { QueryState } from '../components/QueryState.js';
import { Banner } from '../components/ui/Banner.js';
import { Button } from '../components/ui/Button.js';
import { Field, TextInput } from '../components/ui/Field.js';
import { TableShell, Td, Th } from '../components/ui/TableShell.js';

export function KonksPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const konksQuery = useQuery({
    queryKey: ['catalog', 'konks'],
    queryFn: () => api.listKonks(),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.seedKonk({ name, title, url }),
    onSuccess: async () => {
      setName('');
      setTitle('');
      setUrl('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['catalog', 'konks'] });
    },
    onError: (err) => {
      setError(err instanceof WebApiClientError ? err.message : 'Seed failed');
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Konks" description="Competitor catalog (list + seed)" />

      <QueryState
        isLoading={konksQuery.isLoading}
        error={konksQuery.error}
        isEmpty={konksQuery.data?.items.length === 0}
        emptyMessage="No konks seeded"
      >
        {konksQuery.data ? (
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>Name</Th>
                <Th>Title</Th>
                <Th>URL</Th>
              </tr>
            </thead>
            <tbody>
              {konksQuery.data.items.map((konk) => (
                <tr key={konk.id} className="border-t border-slate-100">
                  <Td className="font-mono">
                    <Link className="text-slate-900 underline" to={`/konks/${konk.name}`}>
                      {konk.name}
                    </Link>
                  </Td>
                  <Td>{konk.title}</Td>
                  <Td className="font-mono text-xs">{konk.url || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}
      </QueryState>

      <section className="space-y-3 border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Seed konk</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="URL">
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        </div>
        <Button
          variant="primary"
          disabled={!name || !title || seedMutation.isPending}
          onClick={() => seedMutation.mutate()}
        >
          Seed
        </Button>
        {error ? <Banner tone="error">{error}</Banner> : null}
      </section>
    </div>
  );
}
