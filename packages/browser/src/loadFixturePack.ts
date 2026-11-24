import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFixtureManifest, type FixtureManifest, type FixtureSlot } from '@balloons/domain';

export type LoadedFixtureSlot = FixtureSlot & {
  html: string;
};

export type LoadedFixturePack = {
  konk: string;
  dir: string;
  manifest: FixtureManifest;
  slots: LoadedFixtureSlot[];
};

export function resolveFixturePackDir(fixturesRoot: string, konk: string): string {
  return path.join(fixturesRoot, konk);
}

export async function loadFixturePack(
  fixturesRoot: string,
  konk: string,
): Promise<LoadedFixturePack> {
  const dir = resolveFixturePackDir(fixturesRoot, konk);
  const manifestPath = path.join(dir, 'manifest.json');
  const raw = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
  const manifest = parseFixtureManifest(raw);

  if (manifest.konk !== konk) {
    throw new Error(
      `Fixture pack mismatch: dir konk "${konk}" vs manifest.konk "${manifest.konk}"`,
    );
  }

  const slots: LoadedFixtureSlot[] = [];
  for (const slot of manifest.slots) {
    const filePath = path.join(dir, slot.file);
    const html = await readFile(filePath, 'utf8');
    slots.push({ ...slot, html });
  }

  return { konk, dir, manifest, slots };
}

export function findSlotById(pack: LoadedFixturePack, id: string): LoadedFixtureSlot | undefined {
  return pack.slots.find((slot) => slot.id === id);
}

export function findSlotByUrl(
  pack: LoadedFixturePack,
  url: string,
  slotId?: string,
): LoadedFixtureSlot | undefined {
  return pack.slots.find((slot) => {
    if (slotId && slot.id !== slotId) {
      return false;
    }
    return slot.meta?.url === url;
  });
}
