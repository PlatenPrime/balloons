import { findSlotById, findSlotByUrl, loadFixturePack } from './loadFixturePack.js';
import { createFixtureTransport } from './pipeline/fixtureTransport.js';
import type { HttpLike } from './pipeline/httpLike.js';
import { StageError } from './pipeline/stageError.js';
import { runPerfectSku } from './pipelines/runPerfectSku.js';
import { runBalunSku, runDojdevikSku } from './pipelines/runPromUaSku.js';
import { runSharteSku } from './pipelines/runSharteSku.js';
import { parseSkuPage, parseSkugrPage } from './registry.js';
import type { FetchKonkPageDataInput, ParseContext, SkugrPageData, SkuPageData } from './types.js';

export type FetchKonkPageDataOptions = {
  fixturesRoot: string;
  /** Optional override; default is FixtureTransport bound to the resolved slot. */
  transport?: HttpLike;
};

function resolvePreferredSlotIds(type: 'sku' | 'skugr'): string[] {
  return type === 'sku'
    ? ['sku-page', 'sku-oos', 'sku-discount', 'sku-pack', 'sku-cart', 'sku-cart-fail']
    : ['skugr-page'];
}

function toParseContext(konk: string, url: string, productId: string | undefined): ParseContext {
  const ctx: ParseContext = { konk, url };
  if (productId !== undefined) {
    ctx.productId = productId;
  }
  return ctx;
}

export async function fetchKonkPageData(
  input: FetchKonkPageDataInput,
  options: FetchKonkPageDataOptions,
): Promise<SkuPageData | SkugrPageData> {
  const { konk, url, type } = input;
  const pack = await loadFixturePack(options.fixturesRoot, konk);

  let slot = findSlotByUrl(pack, url);
  if (!slot) {
    for (const id of resolvePreferredSlotIds(type)) {
      const candidate = findSlotById(pack, id);
      if (candidate?.meta?.url === url) {
        slot = candidate;
        break;
      }
    }
  }
  if (!slot) {
    const fallbackId = type === 'sku' ? 'sku-page' : 'skugr-page';
    slot = findSlotById(pack, fallbackId);
  }
  if (!slot) {
    throw new StageError(konk, 'resolveSlot', `No fixture slot for url=${url} type=${type}`);
  }

  const transport = options.transport ?? createFixtureTransport({ konk, packDir: pack.dir, slot });

  const productId = typeof slot.meta?.productId === 'string' ? slot.meta.productId : undefined;
  const ctx = toParseContext(konk, url, productId);

  if (type === 'skugr') {
    const htmlRes = await transport.request({ stageKey: 'fetchHtml', url });
    return parseSkugrPage(htmlRes.body, ctx);
  }

  switch (konk) {
    case 'balun':
      return runBalunSku(url, transport);
    case 'dojdevik':
      return runDojdevikSku(url, transport);
    case 'sharte':
      return runSharteSku(url, transport, ctx);
    case 'perfect':
      return runPerfectSku(url, transport, ctx);
    default: {
      const htmlRes = await transport.request({ stageKey: 'fetchHtml', url });
      return parseSkuPage(htmlRes.body, ctx);
    }
  }
}
