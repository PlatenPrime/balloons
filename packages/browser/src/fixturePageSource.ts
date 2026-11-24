import type { PageSource } from '@balloons/domain';

import {
  findSlotById,
  findSlotByUrl,
  loadFixturePack,
  type LoadedFixturePack,
} from './loadFixturePack.js';

export type FixturePageSourceOptions = {
  fixturesRoot: string;
};

export function createFixturePageSource(options: FixturePageSourceOptions): PageSource {
  const cache = new Map<string, Promise<LoadedFixturePack>>();

  const getPack = (konk: string): Promise<LoadedFixturePack> => {
    let pending = cache.get(konk);
    if (!pending) {
      pending = loadFixturePack(options.fixturesRoot, konk);
      cache.set(konk, pending);
    }
    return pending;
  };

  const resolveHtml = async (
    konk: string,
    url: string,
    preferredSlotId: 'sku-page' | 'skugr-page',
  ): Promise<string> => {
    const pack = await getPack(konk);
    const byUrl = findSlotByUrl(pack, url, preferredSlotId) ?? findSlotByUrl(pack, url);
    if (byUrl) {
      return byUrl.html;
    }

    const byId = findSlotById(pack, preferredSlotId);
    if (byId) {
      return byId.html;
    }

    throw new Error(
      `FixturePageSource: no ${preferredSlotId} HTML for konk "${konk}" url "${url}"`,
    );
  };

  return {
    getSkuPageHtml(konk, url) {
      return resolveHtml(konk, url, 'sku-page');
    },
    getSkugrPageHtml(konk, url) {
      return resolveHtml(konk, url, 'skugr-page');
    },
  };
}
