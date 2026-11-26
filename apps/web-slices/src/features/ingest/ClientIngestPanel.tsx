import { WebApiClientError } from '@balloons/web-api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { Banner } from '../../components/ui/Banner.js';
import { Button } from '../../components/ui/Button.js';
import { Field, TextInput, TextTextarea } from '../../components/ui/Field.js';
import { TableShell, Td, Th } from '../../components/ui/TableShell.js';
import { QueryState } from '../../components/QueryState.js';
import {
  formatIngestError,
  formatIngestFailure,
  formatIngestSuccess,
} from './clientIngestFeedback.js';
import {
  buildExtensionCaptureRequest,
  onCaptureError,
  onCaptureMutate,
  onCaptureSettled,
  onCaptureSuccess,
  type CaptureMutationUiState,
} from './captureMutationLifecycle.js';
import { requestExtensionCapture } from './extensionBridge.js';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function ClientIngestPanel({ konkName }: { konkName: string }) {
  const queryClient = useQueryClient();
  const [skuId, setSkuId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [html, setHtml] = useState('');
  const [captureUi, setCaptureUi] = useState<CaptureMutationUiState>({
    capturingSkuId: null,
    message: null,
    shouldInvalidatePending: false,
  });
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ['slices', konkName, 'pending'],
    queryFn: () => api.listPending(konkName),
  });

  const ingestMutation = useMutation({
    mutationFn: () => api.ingestHtml(konkName, { skuId, sourceUrl, html }),
    onSuccess: (result) => {
      if (result.ok) {
        setIngestMessage(formatIngestSuccess(result));
        setHtml('');
        void queryClient.invalidateQueries({ queryKey: ['slices', konkName] });
      } else {
        setIngestMessage(formatIngestFailure(result));
      }
    },
    onError: (err) => {
      setIngestMessage(err instanceof WebApiClientError ? err.message : formatIngestError(err));
    },
  });

  const captureMutation = useMutation({
    mutationFn: (item: { skuId: string; sourceUrl: string }) =>
      requestExtensionCapture(
        buildExtensionCaptureRequest({
          konk: konkName,
          skuId: item.skuId,
          sourceUrl: item.sourceUrl,
          apiBaseUrl,
        }),
      ),
    onMutate: (item) => {
      setCaptureUi((prev) => onCaptureMutate(prev, item));
      setIngestMessage(null);
    },
    onSuccess: (result) => {
      setCaptureUi((prev) => onCaptureSuccess(prev, result));
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ['slices', konkName] });
      }
    },
    onError: (err) => {
      setCaptureUi((prev) => onCaptureError(prev, err));
    },
    onSettled: () => {
      setCaptureUi((prev) => onCaptureSettled(prev));
    },
  });

  const bannerMessage = captureUi.message ?? ingestMessage;
  const capturingSkuId = captureUi.capturingSkuId;

  return (
    <section className="space-y-3 border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Client ingest</h2>
        <p className="text-sm text-slate-500">
          Pending invalid SKUs → extension Capture or paste HTML → POST /slices/{konkName}/ingest
        </p>
      </div>

      <QueryState
        isLoading={pendingQuery.isLoading}
        error={pendingQuery.error}
        isEmpty={pendingQuery.data?.items.length === 0}
        emptyMessage="No pending SKUs for today"
      >
        {pendingQuery.data ? (
          <TableShell>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <Th>SKU</Th>
                <Th>Product</Th>
                <Th>Title</Th>
                <Th>URL</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {pendingQuery.data.items.map((item) => (
                <tr key={item.skuId} className="border-t border-slate-100">
                  <Td className="font-mono text-xs">{item.skuId}</Td>
                  <Td className="font-mono text-xs">{item.productId}</Td>
                  <Td>{item.title}</Td>
                  <Td className="font-mono text-xs">{item.url || '—'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setSkuId(item.skuId);
                          setSourceUrl(item.url);
                        }}
                      >
                        Use
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={!item.url || capturingSkuId !== null}
                        onClick={() =>
                          captureMutation.mutate({ skuId: item.skuId, sourceUrl: item.url })
                        }
                      >
                        {capturingSkuId === item.skuId ? 'Capturing…' : 'Capture'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : null}
      </QueryState>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="SKU id">
          <TextInput value={skuId} onChange={(e) => setSkuId(e.target.value)} />
        </Field>
        <Field label="Source URL">
          <TextInput value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </Field>
      </div>
      <Field label="HTML">
        <TextTextarea value={html} onChange={(e) => setHtml(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={!skuId || !sourceUrl || !html || ingestMutation.isPending}
          onClick={() => ingestMutation.mutate()}
        >
          {ingestMutation.isPending ? 'Ingesting…' : 'Ingest HTML'}
        </Button>
        <Button
          type="button"
          disabled={!skuId || !sourceUrl || capturingSkuId !== null}
          onClick={() => captureMutation.mutate({ skuId, sourceUrl })}
        >
          {capturingSkuId === skuId ? 'Capturing…' : 'Capture via extension'}
        </Button>
      </div>
      {bannerMessage ? <Banner tone="info">{bannerMessage}</Banner> : null}
    </section>
  );
}
