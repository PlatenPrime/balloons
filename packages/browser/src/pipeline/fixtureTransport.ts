import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { LoadedFixtureSlot } from '../loadFixturePack.js';
import type { HttpLike, HttpLikeRequest, HttpLikeResponse } from './httpLike.js';
import { StageError } from './stageError.js';

export type FixtureTransportOptions = {
  konk: string;
  packDir: string;
  slot: LoadedFixtureSlot;
};

/**
 * Disk-backed HttpLike: `fetchHtml` returns the slot HTML;
 * other stageKeys resolve via `meta.responses[stageKey]` relative to pack dir.
 */
export function createFixtureTransport(options: FixtureTransportOptions): HttpLike {
  const { konk, packDir, slot } = options;
  const responses = (slot.meta?.responses ?? {}) as Record<string, string>;

  return {
    async request(req: HttpLikeRequest): Promise<HttpLikeResponse> {
      if (req.stageKey === 'fetchHtml') {
        return { status: 200, body: slot.html };
      }

      const rel = responses[req.stageKey];
      if (!rel) {
        throw new StageError(
          konk,
          req.stageKey,
          `No fixture response mapped for stage "${req.stageKey}" (slot "${slot.id}")`,
        );
      }

      const filePath = path.join(packDir, rel);
      let body: string;
      try {
        body = await readFile(filePath, 'utf8');
      } catch {
        throw new StageError(
          konk,
          req.stageKey,
          `Fixture response file missing: ${rel} (slot "${slot.id}")`,
        );
      }

      // Convention: *.fail.json → status 500 for fail-path tests; else 200.
      const status = /\.fail\./i.test(rel) ? 500 : 200;
      return { status, body };
    },
  };
}
