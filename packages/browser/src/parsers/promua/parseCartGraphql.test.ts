import { describe, expect, it } from 'vitest';

import {
  normalizeBalunOutcome,
  normalizeDojdevikOutcome,
  parsePromUaAddCartResponse,
  parsePromUaClampResponse,
} from './parseCartGraphql.js';

describe('promua cart stages', () => {
  it('parses not-orderable add', () => {
    const body = JSON.stringify({
      data: { cartAddProduct: { __typename: 'ProductNotOrderableError' } },
    });
    expect(parsePromUaAddCartResponse(body)).toEqual({
      notOrderable: true,
      failed: false,
      cartId: undefined,
      unitPrice: undefined,
    });
  });

  it('parses clamp recalculated quantity', () => {
    const body = JSON.stringify({
      data: {
        cartChangeProductQuantity: {
          __typename: 'RequestedQuantityRecalculatedType',
          reason: 'EXCEEDS_AMOUNT_OF_PRODUCT_IN_STOCK',
          recalculatedQuantity: 7,
          self: {
            cartList: { cart: { items: [{ price: { unit: { selling: '12.5' } } }] } },
          },
        },
      },
    });
    expect(parsePromUaClampResponse(body)).toEqual({
      packs: 7,
      unitPrice: 12.5,
      notOrderable: false,
      failed: false,
    });
  });

  it('normalizes balun / dojdevik outcomes', () => {
    expect(
      normalizeBalunOutcome(
        { htmlPrice: 12.5, artikul: 'BL', packSize: 1 },
        { packs: 7, notOrderable: false, failed: false },
      ),
    ).toEqual({ stock: 7, price: 12.5, artikul: 'BL' });

    expect(
      normalizeDojdevikOutcome(
        { htmlPrice: 60, artikul: 'DJ', title: 'X', packSize: 6 },
        { packs: 2, notOrderable: false, failed: false },
      ),
    ).toEqual({
      stock: 12,
      price: 10,
      artikul: 'DJ',
      title: 'X',
      packSize: 6,
    });
  });
});
