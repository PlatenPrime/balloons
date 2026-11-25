import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(process.cwd(), 'fixtures/pages');

function w(konk, file, content) {
  const full = join(root, konk, file);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function manifest(konk, slots) {
  w(konk, 'manifest.json', JSON.stringify({ konk, slots }, null, 2) + '\n');
}

// --- air ---
w(
  'air',
  'sku-page.html',
  `<!doctype html><html><body>
<input id="max-product-quantity" value="3" />
<div class="us-price-actual">100,50 грн</div>
<span class="us-product-info-code">AIR-1</span>
</body></html>
`,
);
w(
  'air',
  'sku-oos.html',
  `<!doctype html><html><body>
<div class="us-price-actual">100,50 грн</div>
<span class="us-product-info-code">AIR-1</span>
</body></html>
`,
);
w(
  'air',
  'sku-discount.html',
  `<!doctype html><html><body>
<input id="max-product-quantity" value="2" />
<div class="us-price-new">80,00 грн</div>
<span class="us-product-info-code">AIR-2</span>
</body></html>
`,
);
w(
  'air',
  'skugr-page.html',
  `<!doctype html><html><body>
<div id="us-category-products">
  <div class="product-layout" data-pid="101">
    <div class="us-module-img"><a href="https://air.example/p/101"></a></div>
    <div class="us-module-title"><a href="https://air.example/p/101">Ball A</a></div>
  </div>
  <div class="product-layout" data-pid="102">
    <div class="us-module-title"><a href="https://air.example/p/102">Ball B</a></div>
  </div>
</div>
</body></html>
`,
);
manifest('air', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: { url: 'https://air.example/product/1', productId: 'air-1' },
    expected: { stock: 3, price: 100.5, artikul: 'AIR-1' },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: { url: 'https://air.example/product/oos' },
    expected: { stock: 0, price: 100.5, artikul: 'AIR-1' },
  },
  {
    id: 'sku-discount',
    file: 'sku-discount.html',
    meta: { url: 'https://air.example/product/sale' },
    expected: { stock: 2, price: 80, artikul: 'AIR-2' },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://air.example/group/1' },
    expected: {
      products: [
        { productId: '101', url: 'https://air.example/p/101', title: 'Ball A' },
        { productId: '102', url: 'https://air.example/p/102', title: 'Ball B' },
      ],
    },
  },
]);

// --- yumin ---
w(
  'yumin',
  'sku-page.html',
  `<!doctype html><html><body>
<div v-product-customizable-options :initial-price="18.94" :flat-qty="10"></div>
<h1 class="text-3xl">Куля (10 шт)</h1>
<span>Артикул:</span><span>YM-10</span>
</body></html>
`,
);
w(
  'yumin',
  'sku-oos.html',
  `<!doctype html><html><body>
<div v-product-customizable-options :initial-price="18.94" :flat-qty="0"></div>
<h1 class="text-3xl">Куля (10 шт)</h1>
<span>Артикул:</span><span>YM-10</span>
</body></html>
`,
);
w(
  'yumin',
  'sku-pack.html',
  `<!doctype html><html><body>
<div v-product-customizable-options :initial-price="20" :flat-qty="5"></div>
<h1 class="text-3xl">Набір (5 шт)</h1>
<span>Артикул:</span><span>YM-5</span>
</body></html>
`,
);
w(
  'yumin',
  'skugr-page.html',
  JSON.stringify(
    {
      data: [
        { id: 11, name: 'Item 11', url_key: 'item-11' },
        { id: 12, name: 'Item 12', url_key: 'item-12' },
      ],
      links: { next: null },
    },
    null,
    2,
  ) + '\n',
);
manifest('yumin', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: { url: 'https://yumi.market/p/1' },
    expected: {
      stock: 100,
      price: 1.894,
      title: 'Куля (10 шт)',
      artikul: 'YM-10',
      packSize: 10,
    },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: { url: 'https://yumi.market/p/oos' },
    expected: {
      stock: 0,
      price: 1.894,
      title: 'Куля (10 шт)',
      artikul: 'YM-10',
      packSize: 10,
    },
  },
  {
    id: 'sku-pack',
    file: 'sku-pack.html',
    meta: { url: 'https://yumi.market/p/pack' },
    expected: {
      stock: 25,
      price: 4,
      title: 'Набір (5 шт)',
      artikul: 'YM-5',
      packSize: 5,
    },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://yumi.market/api/products' },
    expected: {
      products: [
        { productId: '11', url: 'https://yumi.market/item-11', title: 'Item 11' },
        { productId: '12', url: 'https://yumi.market/item-12', title: 'Item 12' },
      ],
    },
  },
]);

// --- svbum ---
w(
  'svbum',
  'sku-page.html',
  `<!doctype html><html><body>
<h1 class="page-title">Куля (10 шт)</h1>
<div id="product">
  <li>Артикул: <strong>SV-10</strong></li>
  <input data-product-quantity="5" />
  <div class="product-control-price"><span class="price-new"><span data-price="20">20 грн</span></span></div>
</div>
</body></html>
`,
);
w(
  'svbum',
  'sku-oos.html',
  `<!doctype html><html><body>
<h1 class="page-title">Куля (10 шт)</h1>
<div id="product">
  <div class="product-options-list">
    <label><span class="product-option--name">Пачка (10 шт)</span>
      <input type="radio" data-option-quantity="0" data-price="20" data-special="18" />
    </label>
  </div>
</div>
</body></html>
`,
);
w(
  'svbum',
  'sku-discount.html',
  `<!doctype html><html><body>
<h1 class="page-title">Куля (10 шт)</h1>
<div id="product">
  <input data-product-quantity="3" />
  <div class="product-control-price"><span class="price-new"><span data-special="15" data-price="20">15 грн</span></span></div>
</div>
</body></html>
`,
);
w(
  'svbum',
  'skugr-page.html',
  `<!doctype html><html><body>
<ul>
  <li class="product-layout"><div class="product-thumb">
    <button data-p_id="501"></button>
    <div class="product-title"><a href="https://svbum.example/501">SV A</a></div>
  </div></li>
</ul>
</body></html>
`,
);
manifest('svbum', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: { url: 'https://svbum.example/p/1' },
    expected: {
      stock: 50,
      price: 2,
      title: 'Куля (10 шт)',
      artikul: 'SV-10',
      packSize: 10,
    },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: { url: 'https://svbum.example/p/oos' },
    expected: { stock: 0, price: 1.8, title: 'Куля (10 шт)', packSize: 10 },
  },
  {
    id: 'sku-discount',
    file: 'sku-discount.html',
    meta: { url: 'https://svbum.example/p/sale' },
    expected: { stock: 30, price: 1.5, title: 'Куля (10 шт)', packSize: 10 },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://svbum.example/g/1' },
    expected: {
      products: [{ productId: '501', url: 'https://svbum.example/501', title: 'SV A' }],
    },
  },
]);

// --- partymall ---
w(
  'partymall',
  'sku-page.html',
  `<!doctype html><html><body>
<div id="product">
  <h1>Куля PM</h1>
  <span id="product-model-1">PM-1</span>
  <div class="ds-product-main-stock">В наявності: 12</div>
  <div class="ds-product-main-price"><div class="ds-price-new">30.00 грн</div></div>
  <div class="ds-product-attributes-item">
    <span class="secondary-text">Кількість в упаковці</span>
    <span class="fw-500">10</span>
  </div>
</div>
</body></html>
`,
);
w(
  'partymall',
  'sku-oos.html',
  `<!doctype html><html><body>
<div id="product">
  <h1>Куля PM</h1>
  <span id="product-model-1">PM-1</span>
  <div class="ds-product-main-stock red-text">немає в наявності</div>
  <div class="ds-product-main-price"><div class="ds-price-new">30.00 грн</div></div>
</div>
</body></html>
`,
);
w(
  'partymall',
  'sku-pack.html',
  `<!doctype html><html><body>
<div id="product">
  <h1>Куля pack</h1>
  <span id="product-model-2">PM-2</span>
  <div class="ds-product-main-stock">В наявності: 4</div>
  <div class="ds-product-main-price"><div class="ds-price-new">40 грн</div></div>
  <div class="ds-product-attributes-item">
    <span class="secondary-text">Кількість в упаковці</span>
    <span class="fw-500">5</span>
  </div>
</div>
</body></html>
`,
);
w(
  'partymall',
  'skugr-page.html',
  `<!doctype html><html><body>
<div class="ds-category-products">
  <div class="ds-module-item" data-pid="701"><a class="ds-module-title" href="https://partymall.example/701">PM A</a></div>
  <div class="ds-module-item" data-pid="0000"><a class="ds-module-title" href="#">skip</a></div>
</div>
</body></html>
`,
);
manifest('partymall', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: { url: 'https://partymall.example/p/1' },
    expected: {
      stock: 120,
      price: 3,
      title: 'Куля PM',
      artikul: 'PM-1',
      packSize: 10,
    },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: { url: 'https://partymall.example/p/oos' },
    expected: { stock: 0, price: 30, title: 'Куля PM', artikul: 'PM-1' },
  },
  {
    id: 'sku-pack',
    file: 'sku-pack.html',
    meta: { url: 'https://partymall.example/p/pack' },
    expected: {
      stock: 20,
      price: 8,
      title: 'Куля pack',
      artikul: 'PM-2',
      packSize: 5,
    },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://partymall.example/g/1' },
    expected: {
      products: [{ productId: '701', url: 'https://partymall.example/701', title: 'PM A' }],
    },
  },
]);

// --- balun (Prom cart) ---
w(
  'balun',
  'sku-page.html',
  `<!doctype html><html><body>
<meta name="csrf-token" content="csrf-balun" />
<div data-analytics='{"clerk":{"price_original":"12.50"}}'></div>
<span data-qaid="product_code" title="BL-01">BL-01</span>
</body></html>
`,
);
w(
  'balun',
  'sku-oos.html',
  `<!doctype html><html><body>
<meta name="csrf-token" content="csrf-balun" />
<div data-analytics='{"clerk":{"price_original":"12.50"}}'></div>
<span data-qaid="product_code" title="BL-01">BL-01</span>
</body></html>
`,
);
w(
  'balun',
  'skugr-page.html',
  `<!doctype html><html><body>
<button data-qaid="buy-button" data-product-id="201" data-product-name="Balun A" data-product-url="https://balun.example/p201"></button>
<li data-qaid="product-block" data-product-id="202">
  <a class="b-product-gallery__title">Balun B OOS</a>
  <a class="b-product-gallery__image-link" href="https://balun.example/p202"></a>
</li>
</body></html>
`,
);
w(
  'balun',
  'responses/add-to-cart.ok.json',
  JSON.stringify({
    data: {
      cartAddProduct: {
        __typename: 'CartAddProductSuccess',
        self: {
          cartList: {
            carts: [
              {
                id: 'cart-1',
                items: [{ price: { unit: { selling: '12.50' } } }],
              },
            ],
          },
        },
      },
    },
  }),
);
w(
  'balun',
  'responses/clamp-qty.ok.json',
  JSON.stringify({
    data: {
      cartChangeProductQuantity: {
        __typename: 'RequestedQuantityRecalculatedType',
        reason: 'EXCEEDS_AMOUNT_OF_PRODUCT_IN_STOCK',
        recalculatedQuantity: 7,
        self: {
          cartList: {
            cart: { items: [{ price: { unit: { selling: '12.50' } } }] },
          },
        },
      },
    },
  }),
);
w(
  'balun',
  'responses/add-to-cart.not-orderable.json',
  JSON.stringify({
    data: {
      cartAddProduct: { __typename: 'ProductNotOrderableError' },
    },
  }),
);
manifest('balun', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: {
      url: 'https://balun.example/p123/',
      productId: '123',
      responses: {
        addToCart: 'responses/add-to-cart.ok.json',
        clampQty: 'responses/clamp-qty.ok.json',
      },
    },
    expected: { stock: 7, price: 12.5, artikul: 'BL-01' },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: {
      url: 'https://balun.example/p124/',
      responses: {
        addToCart: 'responses/add-to-cart.not-orderable.json',
      },
    },
    expected: { stock: 0, price: 12.5, artikul: 'BL-01' },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://balun.example/group/1' },
    expected: {
      products: [
        {
          productId: '201',
          url: 'https://balun.example/p201',
          title: 'Balun A',
        },
        {
          productId: '202',
          url: 'https://balun.example/p202',
          title: 'Balun B OOS',
        },
      ],
    },
  },
]);

// --- dojdevik ---
w(
  'dojdevik',
  'sku-page.html',
  `<!doctype html><html><body>
<meta name="csrf-token" content="csrf-dj" />
<div data-qaid="product_name">Куля (6 шт)</div>
<div data-qaid="product_price" data-qaprice="60.00">60.00 грн</div>
<span data-qaid="product_code">DJ-6</span>
<table><tr>
  <td data-qaid="attribute_name">В упаковці</td>
  <td data-qaid="attribute_value">6 шт.</td>
</tr></table>
</body></html>
`,
);
w(
  'dojdevik',
  'sku-oos.html',
  `<!doctype html><html><body>
<meta name="csrf-token" content="csrf-dj" />
<div data-qaid="product_name">Куля (6 шт)</div>
<div data-qaid="product_price" data-qaprice="60.00">60.00 грн</div>
<span data-qaid="product_code">DJ-6</span>
</body></html>
`,
);
w(
  'dojdevik',
  'skugr-page.html',
  `<!doctype html><html><body>
<button data-qaid="buy-button" data-product-id="301" data-product-name="DJ A" data-product-url="https://dojdevik.example/p301"></button>
</body></html>
`,
);
w(
  'dojdevik',
  'responses/add-to-cart.ok.json',
  JSON.stringify({
    data: {
      cartAddProduct: {
        __typename: 'CartAddProductSuccess',
        self: {
          cartList: {
            carts: [{ id: 'cart-dj', items: [{ price: { unit: { selling: '60.00' } } }] }],
          },
        },
      },
    },
  }),
);
w(
  'dojdevik',
  'responses/clamp-qty.ok.json',
  JSON.stringify({
    data: {
      cartChangeProductQuantity: {
        __typename: 'RequestedQuantityRecalculatedType',
        reason: 'EXCEEDS_AMOUNT_OF_PRODUCT_IN_STOCK',
        recalculatedQuantity: 2,
        self: {
          cartList: {
            cart: { items: [{ price: { unit: { selling: '60.00' } } }] },
          },
        },
      },
    },
  }),
);
w(
  'dojdevik',
  'responses/add-to-cart.not-orderable.json',
  JSON.stringify({
    data: {
      cartAddProduct: { __typename: 'ProductNotOrderableError' },
    },
  }),
);
manifest('dojdevik', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: {
      url: 'https://dojdevik.example/p456/',
      responses: {
        addToCart: 'responses/add-to-cart.ok.json',
        clampQty: 'responses/clamp-qty.ok.json',
      },
    },
    expected: {
      stock: 12,
      price: 10,
      title: 'Куля (6 шт)',
      artikul: 'DJ-6',
      packSize: 6,
    },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: {
      url: 'https://dojdevik.example/p457/',
      responses: {
        addToCart: 'responses/add-to-cart.not-orderable.json',
      },
    },
    expected: {
      stock: 0,
      price: 10,
      title: 'Куля (6 шт)',
      artikul: 'DJ-6',
      packSize: 6,
    },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://dojdevik.example/group/1' },
    expected: {
      products: [
        {
          productId: '301',
          url: 'https://dojdevik.example/p301',
          title: 'DJ A',
        },
      ],
    },
  },
]);

// --- sharte ---
w(
  'sharte',
  'sku-page.html',
  `<!doctype html><html><body>
<div id="catalogElement" data-product-id="12345"></div>
<a class="price changePrice">1.85 грн.</a>
</body></html>
`,
);
w(
  'sharte',
  'sku-cart-fail.html',
  `<!doctype html><html><body>
<div id="catalogElement" data-product-id="12345"></div>
<a class="price changePrice">1.85 грн.</a>
</body></html>
`,
);
w(
  'sharte',
  'skugr-page.html',
  `<!doctype html><html><body>
<div class="items productList">
  <div class="item product sku" data-product-id="801">
    <a class="picture" href="https://sharte.example/801"><img alt="SH A" /></a>
    <a class="name" href="https://sharte.example/801"><span class="middle">SH A</span></a>
  </div>
</div>
</body></html>
`,
);
w(
  'sharte',
  'responses/add-cart.ok.json',
  JSON.stringify({
    ID: '12345',
    '~NAME': 'Sharte ball',
    CATALOG_QUANTITY: 50,
    CATALOG_QUANTITY_RESERVED: 2,
    '~PRICE': 1.85,
  }),
);
w('sharte', 'responses/add-cart.fail.json', JSON.stringify({ error: true }) + '\n');
manifest('sharte', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: {
      url: 'https://sharte.example/p/1',
      responses: { addToCart: 'responses/add-cart.ok.json' },
    },
    expected: {
      stock: 48,
      price: 1.85,
      productId: '12345',
      title: 'Sharte ball',
    },
  },
  {
    id: 'sku-cart-fail',
    file: 'sku-cart-fail.html',
    meta: {
      url: 'https://sharte.example/p/fail',
      responses: { addToCart: 'responses/add-cart.fail.json' },
    },
    expected: { stock: 0, price: 1.85, productId: '12345' },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://sharte.example/group/1' },
    expected: {
      products: [{ productId: '801', url: 'https://sharte.example/801', title: 'SH A' }],
    },
  },
]);

// --- perfect ---
w(
  'perfect',
  'sku-page.html',
  `<!doctype html><html><body>
<div id="main">
  <h1>Куля (10 шт)</h1>
  <div class="product-reference"><span>PF-10</span></div>
  <div id="product-details" data-product='{"quantity":5,"price_without_reduction":40,"name":"Куля (10 шт)"}'></div>
</div>
</body></html>
`,
);
w(
  'perfect',
  'sku-oos.html',
  `<!doctype html><html><body>
<meta property="product:availability" content="out_of_stock" />
<meta property="product:price:amount" content="40" />
<h1>Куля (10 шт)</h1>
<div class="product-reference"><span>PF-10</span></div>
<div class="product-flags out-of-stock">розпродано</div>
</body></html>
`,
);
w(
  'perfect',
  'sku-cart.html',
  `<!doctype html><html><body>
<div id="main">
  <h1>Куля (10 шт)</h1>
  <div class="product-reference"><span>PF-10</span></div>
  <dt>Штук в упаковці</dt><dd>10</dd>
</div>
</body></html>
`,
);
w(
  'perfect',
  'skugr-page.html',
  `<!doctype html><html><body>
<article class="product-miniature js-product-miniature" data-id-product="901">
  <a class="thumbnail product-thumbnail" href="https://perfect.example/901-ball.html">
    <img alt="PF A" />
  </a>
</article>
</body></html>
`,
);
w(
  'perfect',
  'responses/add-to-cart.ok.json',
  JSON.stringify({
    success: true,
    cart: {
      products: [
        {
          id_product: 10,
          stock_quantity: 5,
          price_without_reduction: 40,
          name: 'Куля (10 шт)',
        },
      ],
    },
  }),
);
manifest('perfect', [
  {
    id: 'sku-page',
    file: 'sku-page.html',
    meta: { url: 'https://perfect.example/10-ball.html' },
    expected: {
      stock: 50,
      price: 4,
      title: 'Куля (10 шт)',
      artikul: 'PF-10',
      packSize: 10,
    },
  },
  {
    id: 'sku-oos',
    file: 'sku-oos.html',
    meta: { url: 'https://perfect.example/10-oos.html' },
    expected: {
      stock: 0,
      price: 4,
      title: 'Куля (10 шт)',
      artikul: 'PF-10',
      packSize: 10,
    },
  },
  {
    id: 'sku-cart',
    file: 'sku-cart.html',
    meta: {
      url: 'https://perfect.example/10-cart.html',
      responses: { addToCart: 'responses/add-to-cart.ok.json' },
    },
    expected: {
      stock: 50,
      price: 4,
      title: 'Куля (10 шт)',
      artikul: 'PF-10',
      packSize: 10,
    },
  },
  {
    id: 'skugr-page',
    file: 'skugr-page.html',
    meta: { url: 'https://perfect.example/category/1' },
    expected: {
      products: [
        {
          productId: '901',
          url: 'https://perfect.example/901-ball.html',
          title: 'PF A',
        },
      ],
    },
  },
]);

console.log('fixture packs written');
