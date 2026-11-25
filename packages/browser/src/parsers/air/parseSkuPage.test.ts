import { describe, expect, it } from 'vitest';

import { parseAirSkuPage } from './parseSkuPage.js';

describe('parseAirSkuPage', () => {
  it('reads stock/price/artikul', () => {
    const html = `
      <input id="max-product-quantity" value="3" />
      <div class="us-price-actual">100,50 грн</div>
      <span class="us-product-info-code">AIR-1</span>
    `;
    expect(parseAirSkuPage(html, { konk: 'air' })).toEqual({
      stock: 3,
      price: 100.5,
      artikul: 'AIR-1',
    });
  });

  it('treats missing qty as OOS stock 0', () => {
    const html = `<div class="us-price-new">80 грн</div>`;
    expect(parseAirSkuPage(html, { konk: 'air' })).toEqual({
      stock: 0,
      price: 80,
    });
  });
});
