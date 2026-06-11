const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function run() {
  const html = `<!doctype html><html><body>
    <div id="main-content"></div>
    <ul id="basketList"></ul>
    <div class="cart-buttons-row"></div>
    <a class="basket-link"></a>
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const { window } = dom;

  // Provide a simple in-memory localStorage to avoid environment differences
  class MemoryStorage {
    constructor() { this.store = Object.create(null); }
    getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }
    setItem(k, v) { this.store[k] = String(v); }
    removeItem(k) { delete this.store[k]; }
  }

  const context = {
    window: window,
    document: window.document,
    localStorage: new MemoryStorage(),
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    globalThis: window,
  };

  // Load shop.js into the VM context
  const shopSrc = fs.readFileSync('./shop.js', 'utf8');
  vm.createContext(context);
  vm.runInContext(shopSrc, context);

  // Expose helper to call functions defined in the script
  const call = async (fnName, ...args) => {
    const fn = context[fnName] || context.window[fnName];
    if (typeof fn !== 'function') throw new Error(`Function ${fnName} not found`);
    return fn(...args);
  };

  // Begin smoke tests
  try {
    // Ensure empty basket
    context.localStorage.removeItem('basket');

    // Add an apple
    call('addToBasket', 'apple');
    let basket = context.localStorage.getItem('basket');
    if (!basket) throw new Error('Basket not created after add');
    basket = JSON.parse(basket);
    if (!(Array.isArray(basket) && basket.length === 1 && basket[0].id === 'apple' && basket[0].quantity === 1)) {
      throw new Error('Unexpected basket after 1 apple: ' + JSON.stringify(basket));
    }

    // Add another apple
    call('addToBasket', 'apple');
    basket = JSON.parse(context.localStorage.getItem('basket'));
    if (basket[0].quantity !== 2) throw new Error('Apple quantity should be 2');

    // Increase via changeQuantity
    call('changeQuantity', 'apple', 1);
    basket = JSON.parse(context.localStorage.getItem('basket'));
    if (basket[0].quantity !== 3) throw new Error('Apple quantity should be 3 after changeQuantity');

    // Decrease to 2
    call('changeQuantity', 'apple', -1);
    basket = JSON.parse(context.localStorage.getItem('basket'));
    if (basket[0].quantity !== 2) throw new Error('Apple quantity should be 2 after decrease');

    // Set to 0 removes item
    call('setQuantity', 'apple', 0);
    basket = JSON.parse(context.localStorage.getItem('basket') || '[]');
    if (basket.length !== 0) throw new Error('Apple should be removed when quantity set to 0');

    // Test pricing math: add apple and lemon and verify total
    call('addToBasket', 'apple'); // 45 cents
    call('addToBasket', 'lemon'); // 25 cents
    call('addToBasket', 'lemon'); // lemon qty 2
    const basketObj = JSON.parse(context.localStorage.getItem('basket'));
    const subtotalCents = basketObj.reduce((s, it) => {
      const prices = { apple:45, lemon:25 };
      return s + prices[it.id] * it.quantity;
    }, 0);
    if (subtotalCents !== 45 + 25 * 2) throw new Error('Subtotal cents mismatch');

    console.log('SMOKE TEST PASSED');
    process.exit(0);
  } catch (err) {
    console.error('SMOKE TEST FAILED:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

run();
