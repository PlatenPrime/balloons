import { z } from 'zod';

const fixtureSlotMetaSchema = z
  .object({
    url: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    /** Relative paths under pack dir, keyed by pipeline stage id. */
    responses: z.record(z.string(), z.string().min(1)).optional(),
  })
  .passthrough();

const skuPageExpectedSchema = z
  .object({
    stock: z.number(),
    price: z.number(),
    packSize: z.number().optional(),
    productId: z.string().min(1).optional(),
    artikul: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
  })
  .passthrough();

const skugrPageExpectedSchema = z
  .object({
    products: z.array(
      z.object({
        productId: z.string().min(1),
        url: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      }),
    ),
  })
  .passthrough();

export const fixtureSlotSchema = z
  .object({
    id: z.string().min(1),
    file: z.string().min(1),
    meta: fixtureSlotMetaSchema.optional(),
    expected: z
      .union([skuPageExpectedSchema, skugrPageExpectedSchema, z.record(z.string(), z.unknown())])
      .optional(),
  })
  .passthrough();

export const fixtureManifestSchema = z.object({
  konk: z.string().min(1),
  slots: z.array(fixtureSlotSchema).min(1),
});

export type FixtureManifest = z.infer<typeof fixtureManifestSchema>;
export type FixtureSlot = z.infer<typeof fixtureSlotSchema>;

export function parseFixtureManifest(input: unknown): FixtureManifest {
  return fixtureManifestSchema.parse(input);
}

export function safeParseFixtureManifest(input: unknown) {
  return fixtureManifestSchema.safeParse(input);
}
