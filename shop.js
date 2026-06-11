const PRODUCTS = {
  apple: { name: "Apple", emoji: "🍏", unitPriceCents: 45, categories: ["fruits"] },
  banana: { name: "Banana", emoji: "🍌", unitPriceCents: 65, categories: ["fruits"] },
  grapes: { name: "Grapes", emoji: "🍇", unitPriceCents: 120, categories: ["fruits"] },
  lemon: { name: "Lemon", emoji: "🍋", unitPriceCents: 25, categories: ["fruits"] },
  strawberry: { name: "Strawberry", emoji: "🍓", unitPriceCents: 95, categories: ["fruits"] },
  cucumber: { name: "Cucumber", emoji: "🥒", unitPriceCents: 55, categories: ["vegetables"] },
  avocado: { name: "Avocado", emoji: "🥑", unitPriceCents: 110, categories: ["vegetables"] },
  tomato: { name: "Tomato", emoji: "🍅", unitPriceCents: 40, categories: ["fruits", "vegetables"] },
};

// Display a dismissible in-page error banner
function showError(message) {
  // Avoid duplicating banner
  if (document.getElementById("errorBanner")) return;
  const banner = document.createElement("div");
  banner.id = "errorBanner";
  banner.className = "error-banner";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `
    <span class="error-msg">${message}</span>
    <button class="close-btn" aria-label="Dismiss error">×</button>
  `;
  const main = document.getElementById("main-content") || document.body;
  main.insertBefore(banner, main.firstChild);
  const close = banner.querySelector(".close-btn");
  close.onclick = function () {
    banner.remove();
  };
  // Broadcast the error to other tabs/windows so they can show the banner too
  try {
    localStorage.setItem(
      "lastAddError",
      JSON.stringify({ message: message, ts: Date.now() })
    );
  } catch (e) {
    // ignore storage errors (e.g. private mode)
  }
}

function clearError() {
  const existing = document.getElementById("errorBanner");
  if (existing) existing.remove();
}

// Listen for error broadcasts from other tabs/windows
window.addEventListener("storage", function (e) {
  if (!e.key) return;
  if (e.key === "lastAddError" && e.newValue) {
    try {
      const payload = JSON.parse(e.newValue);
      if (payload && payload.message) {
        showError(payload.message);
      }
    } catch (err) {
      // ignore parse errors
    }
  }
});

function getBasket() {
  try {
    const raw = localStorage.getItem("basket");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Expect an array of { id: string, quantity: number }
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing basket from localStorage:", error);
    return [];
  }
}

function saveBasket(basket) {
  try {
    localStorage.setItem("basket", JSON.stringify(basket));
  } catch (e) {
    console.warn("Could not save basket:", e);
  }
}

function addToBasket(productId) {
  if (!PRODUCTS[productId]) return showError("Unknown product.");
  const basket = getBasket();
  // Prevent grapes and bananas being combined (preserve existing rule)
  const hasBanana = basket.some((i) => i.id === "banana" && i.quantity > 0);
  const hasGrapes = basket.some((i) => i.id === "grapes" && i.quantity > 0);
  if (productId === "grapes" && hasBanana) {
    showError("Grapes and bananas cannot be combined.");
    return;
  }
  if (productId === "banana" && hasGrapes) {
    showError("Grapes and bananas cannot be combined.");
    return;
  }
  const item = basket.find((i) => i.id === productId);
  if (item) {
    item.quantity = item.quantity + 1;
  } else {
    basket.push({ id: productId, quantity: 1 });
  }
  saveBasket(basket);
}

function clearBasket() {
  localStorage.removeItem("basket");
}

function removeFromBasket(productId) {
  const basket = getBasket().filter((i) => i.id !== productId);
  saveBasket(basket);
}

function setQuantity(productId, quantity) {
  let basket = getBasket();
  if (quantity <= 0) {
    basket = basket.filter((i) => i.id !== productId);
    saveBasket(basket);
    return;
  }
  const item = basket.find((i) => i.id === productId);
  if (item) {
    item.quantity = quantity;
  } else {
    basket.push({ id: productId, quantity: quantity });
  }
  saveBasket(basket);
}

function changeQuantity(productId, delta) {
  const basket = getBasket();
  const item = basket.find((i) => i.id === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  setQuantity(productId, newQty);
}

function formatCentsToEuro(cents) {
  const euros = (cents / 100).toFixed(2);
  return `€${euros}`;
}

function renderBasket() {
  const basket = getBasket();
  const basketList = document.getElementById("basketList");
  const cartButtonsRow = document.querySelector(".cart-buttons-row");
  if (!basketList) return;
  basketList.innerHTML = "";
  if (basket.length === 0) {
    basketList.innerHTML = "<li>No products in basket.</li>";
    if (cartButtonsRow) cartButtonsRow.style.display = "none";
    return;
  }
  // Create header row
  const header = document.createElement("li");
  header.className = "basket-header";
  header.innerHTML = `<strong>Product</strong> <strong>Unit</strong> <strong>Qty</strong> <strong>Subtotal</strong> <span></span>`;
  basketList.appendChild(header);

  let totalCents = 0;
  basket.forEach((entry) => {
    const product = PRODUCTS[entry.id];
    if (!product) return;
    const subtotal = product.unitPriceCents * entry.quantity;
    totalCents += subtotal;

    const li = document.createElement("li");
    li.className = "basket-item";
    li.innerHTML = `
      <span class='basket-emoji'>${product.emoji}</span>
      <span class='basket-name'>${product.name}</span>
      <span class='basket-unit'>${formatCentsToEuro(product.unitPriceCents)}</span>
      <span class='basket-qty'>
        <button class='qty-decrease' data-id='${entry.id}' aria-label='Decrease quantity'>−</button>
        <span class='qty-value' data-id='${entry.id}'>${entry.quantity}</span>
        <button class='qty-increase' data-id='${entry.id}' aria-label='Increase quantity'>+</button>
      </span>
      <span class='basket-sub'>${formatCentsToEuro(subtotal)}</span>
      <button class='remove-item' data-id='${entry.id}' aria-label='Remove item'>Remove</button>
    `;
    basketList.appendChild(li);
  });

  const totalLi = document.createElement("li");
  totalLi.className = "basket-total";
  totalLi.innerHTML = `<strong>Total:</strong> <span class='total-value'>${formatCentsToEuro(totalCents)}</span>`;
  basketList.appendChild(totalLi);

  if (cartButtonsRow) cartButtonsRow.style.display = "flex";

  // Attach event listeners for controls
  const incs = document.querySelectorAll(".qty-increase");
  incs.forEach((btn) => {
    btn.onclick = function () {
      const id = this.getAttribute("data-id");
      changeQuantity(id, 1);
      renderBasket();
      renderBasketIndicator();
    };
  });
  const decs = document.querySelectorAll(".qty-decrease");
  decs.forEach((btn) => {
    btn.onclick = function () {
      const id = this.getAttribute("data-id");
      changeQuantity(id, -1);
      renderBasket();
      renderBasketIndicator();
    };
  });
  const removes = document.querySelectorAll(".remove-item");
  removes.forEach((btn) => {
    btn.onclick = function () {
      const id = this.getAttribute("data-id");
      removeFromBasket(id);
      renderBasket();
      renderBasketIndicator();
    };
  });
}

function renderBasketIndicator() {
  const basket = getBasket();
  const totalQty = basket.reduce((s, i) => s + (i.quantity || 0), 0);
  let indicator = document.querySelector(".basket-indicator");
  if (!indicator) {
    const basketLink = document.querySelector(".basket-link");
    if (!basketLink) return;
    indicator = document.createElement("span");
    indicator.className = "basket-indicator";
    basketLink.appendChild(indicator);
  }
  if (totalQty > 0) {
    indicator.textContent = totalQty;
    indicator.style.display = "flex";
  } else {
    indicator.style.display = "none";
  }
}

// Call this on page load and after basket changes
if (document.readyState !== "loading") {
  renderBasketIndicator();
} else {
  document.addEventListener("DOMContentLoaded", renderBasketIndicator);
}

// Patch (expose) functions to window and ensure indicator updates
const origAdd = window.addToBasket;
window.addToBasket = function (productId) {
  try {
    addToBasket(productId);
  } catch (e) {
    console.warn(e);
  }
  renderBasketIndicator();
};
window.clearBasket = function () {
  clearBasket();
  renderBasketIndicator();
  renderBasket();
};

window.removeFromBasket = function (id) {
  removeFromBasket(id);
  renderBasketIndicator();
  renderBasket();
};

window.setQuantity = setQuantity;
