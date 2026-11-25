import type { SkuPageData } from '../../types.js';
import { parseMoney, roundMoney } from '../../util/parseMoney.js';
import { skuResult } from '../../util/result.js';
import type { PromUaHtmlContext } from './parseHtmlContext.js';

type AddCartJson = {
  data?: {
    cartAddProduct?: {
      __typename?: string;
      self?: {
        cartList?: {
          carts?: Array<{
            id?: string;
            items?: Array<{ price?: { unit?: { selling?: string } } }>;
          }>;
        };
      };
    };
  };
};

type ClampJson = {
  data?: {
    cartChangeProductQuantity?: {
      __typename?: string;
      reason?: string;
      recalculatedQuantity?: number;
      self?: {
        cartList?: {
          cart?: {
            items?: Array<{ price?: { unit?: { selling?: string } } }>;
          };
        };
      };
    };
  };
};

export type PromUaCartOutcome = {
  packs: number;
  unitPrice?: number;
  notOrderable: boolean;
  failed: boolean;
};

export function parsePromUaAddCartResponse(body: string): {
  cartId?: string;
  unitPrice?: number;
  notOrderable: boolean;
  failed: boolean;
} {
  let parsed: AddCartJson;
  try {
    parsed = JSON.parse(body) as AddCartJson;
  } catch {
    return { notOrderable: false, failed: true };
  }

  const node = parsed.data?.cartAddProduct;
  const typename = node?.__typename ?? '';
  if (
    typename === 'ProductNotOrderableError' ||
    typename === 'CantAddDeletedProductToCartErrorType'
  ) {
    return { notOrderable: true, failed: false };
  }
  if (typename !== 'CartAddProductSuccess') {
    return { notOrderable: false, failed: true };
  }

  const cart = node?.self?.cartList?.carts?.[0];
  const out: {
    cartId?: string;
    unitPrice?: number;
    notOrderable: boolean;
    failed: boolean;
  } = { notOrderable: false, failed: false };
  if (cart?.id !== undefined) {
    out.cartId = cart.id;
  }
  const unitPrice = parseMoney(cart?.items?.[0]?.price?.unit?.selling ?? '');
  if (unitPrice !== undefined) {
    out.unitPrice = unitPrice;
  }
  return out;
}

export function parsePromUaClampResponse(body: string): PromUaCartOutcome {
  let parsed: ClampJson;
  try {
    parsed = JSON.parse(body) as ClampJson;
  } catch {
    return { packs: -1, notOrderable: false, failed: true };
  }

  const node = parsed.data?.cartChangeProductQuantity;
  const typename = node?.__typename ?? '';
  if (typename === 'RequestedQuantitySet') {
    return { packs: -1, notOrderable: false, failed: true };
  }
  if (typename !== 'RequestedQuantityRecalculatedType') {
    return { packs: -1, notOrderable: false, failed: true };
  }
  if (node?.reason !== 'EXCEEDS_AMOUNT_OF_PRODUCT_IN_STOCK') {
    return { packs: -1, notOrderable: false, failed: true };
  }

  const packs = Number(node.recalculatedQuantity);
  if (!Number.isFinite(packs)) {
    return { packs: -1, notOrderable: false, failed: true };
  }

  const out: PromUaCartOutcome = { packs, notOrderable: false, failed: false };
  const unitPrice = parseMoney(node.self?.cartList?.cart?.items?.[0]?.price?.unit?.selling ?? '');
  if (unitPrice !== undefined) {
    out.unitPrice = unitPrice;
  }
  return out;
}

export function normalizeBalunOutcome(
  ctx: PromUaHtmlContext,
  cart: PromUaCartOutcome,
): SkuPageData {
  if (cart.failed && !cart.notOrderable) {
    return skuResult(-1, -1, { artikul: ctx.artikul });
  }

  const price = ctx.htmlPrice ?? cart.unitPrice;
  if (price === undefined) {
    return skuResult(-1, -1, { artikul: ctx.artikul });
  }

  if (cart.notOrderable) {
    return skuResult(0, price, { artikul: ctx.artikul });
  }

  return skuResult(cart.packs, price, { artikul: ctx.artikul });
}

export function normalizeDojdevikOutcome(
  ctx: PromUaHtmlContext,
  cart: PromUaCartOutcome,
): SkuPageData {
  if (cart.failed && !cart.notOrderable) {
    return skuResult(-1, -1, { artikul: ctx.artikul, title: ctx.title });
  }

  const packagePrice = ctx.htmlPrice ?? cart.unitPrice;
  if (packagePrice === undefined) {
    return skuResult(-1, -1, { artikul: ctx.artikul, title: ctx.title });
  }

  const packSize = ctx.packSize > 0 ? ctx.packSize : 1;
  const price = roundMoney(packagePrice / packSize);

  if (cart.notOrderable) {
    return skuResult(0, price, {
      artikul: ctx.artikul,
      title: ctx.title,
      packSize: packSize > 1 ? packSize : undefined,
    });
  }

  return skuResult(cart.packs * packSize, price, {
    artikul: ctx.artikul,
    title: ctx.title,
    packSize: packSize > 1 ? packSize : undefined,
  });
}
