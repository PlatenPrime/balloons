import type { SliceJob } from '@balloons/slice-engine';
import { describe, expect, it } from 'vitest';
import { serializeSliceJob } from './serialize.js';

function baseJob(payload: SliceJob['payload']): SliceJob {
  return {
    id: 'slice-job-1',
    kind: payload.kind,
    status: 'queued',
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    updatedAt: new Date('2026-07-15T10:00:00.000Z'),
    payload,
  };
}

describe('serializeSliceJob', () => {
  it('serializes all payload kinds with defined wire payload', () => {
    const run = serializeSliceJob(
      baseJob({
        kind: 'slice.run',
        konk: 'air',
        day: new Date('2026-07-15T12:00:00.000Z'),
      }),
    );
    expect(run.payload).toEqual({
      kind: 'slice.run',
      konk: 'air',
      day: '2026-07-15T00:00:00.000Z',
    });

    const compensation = serializeSliceJob(
      baseJob({
        kind: 'compensation.run',
        konk: 'air',
      }),
    );
    expect(compensation.payload).toEqual({
      kind: 'compensation.run',
      konk: 'air',
    });

    const band = serializeSliceJob(
      baseJob({
        kind: 'stock-band.batch-correct',
        bandId: 'band-1',
        productIds: ['p1'],
        dateFrom: new Date('2026-07-14T12:00:00.000Z'),
        dateTo: new Date('2026-07-15T12:00:00.000Z'),
      }),
    );
    expect(band.payload).toEqual({
      kind: 'stock-band.batch-correct',
      bandId: 'band-1',
      productIds: ['p1'],
      dateFrom: '2026-07-14T00:00:00.000Z',
      dateTo: '2026-07-15T00:00:00.000Z',
    });
  });

  it('rejects unknown payload kinds at runtime', () => {
    const bogus = baseJob({
      kind: 'slice.run',
      konk: 'air',
      day: new Date('2026-07-15T12:00:00.000Z'),
    });
    (bogus.payload as { kind: string }).kind = 'unknown.kind';
    expect(() => serializeSliceJob(bogus)).toThrow(/Unknown slice job payload/);
  });
});
