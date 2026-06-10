const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function fail(msg) {
  console.error('TEST FAIL:', msg);
  process.exit(1);
}

function ok(cond, msg) {
  if (!cond) fail(msg || 'assertion failed');
}

async function run() {
  const html = `<!doctype html><html><head></head><body><main id="main-content"></main></body></html>`;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/'
  });
  const win = dom.window;

  // Provide a minimal localStorage polyfill for the JSDOM window
  if (!win.localStorage) {
    win.localStorage = (function () {
      let store = {};
      return {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(store, key)
            ? store[key]
            : null;
        },
        setItem(key, value) {
          store[key] = String(value);
        },
        removeItem(key) {
          delete store[key];
        },
        clear() {
          store = {};
        },
      };
    })();
  }

  // Load shop.js into the JSDOM environment
  const shopJs = fs.readFileSync(path.join(__dirname, '..', 'shop.js'), 'utf8');
  // Ensure a `localStorage` global binding exists for scripts that reference it
  const setupScript = dom.window.document.createElement('script');
  setupScript.textContent = 'var localStorage = window.localStorage;';
  dom.window.document.body.appendChild(setupScript);

  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = shopJs;
  dom.window.document.body.appendChild(scriptEl);

  // Utility to read basket from localStorage
  function getBasket() {
    const raw = win.localStorage.getItem('basket');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  // Test 1: banana then strawberry should be blocked
  win.localStorage.clear();
  if (typeof win.addToBasket !== 'function') {
    fail('addToBasket not defined');
  }
  win.addToBasket('banana');
  ok(getBasket().includes('banana'), 'banana should be added');
  win.addToBasket('strawberry');
  ok(getBasket().length === 1 && getBasket()[0] === 'banana', 'strawberry should NOT be added when banana present');
  const err = win.document.getElementById('errorBanner');
  ok(err && err.textContent.includes('Strawberries and bananas cannot be combined.'), 'error banner should appear for banana->strawberry');

  // Clear and Test 2: strawberry then banana should be blocked
  win.localStorage.clear();
  // remove any existing banner
  const existing = win.document.getElementById('errorBanner');
  if (existing) existing.remove();
  win.addToBasket('strawberry');
  ok(getBasket().includes('strawberry'), 'strawberry should be added');
  win.addToBasket('banana');
  ok(getBasket().length === 1 && getBasket()[0] === 'strawberry', 'banana should NOT be added when strawberry present');
  const err2 = win.document.getElementById('errorBanner');
  ok(err2 && err2.textContent.includes('Strawberries and bananas cannot be combined.'), 'error banner should appear for strawberry->banana');

  // Test 3: strawberry can coexist with apple
  win.localStorage.clear();
  const e = win.document.getElementById('errorBanner');
  if (e) e.remove();
  win.addToBasket('strawberry');
  win.addToBasket('apple');
  const b = getBasket();
  ok(b.includes('strawberry') && b.includes('apple') && b.length === 2, 'strawberry and apple should coexist');

  console.log('All tests passed');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
