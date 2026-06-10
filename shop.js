const PRODUCTS = {
  apple: { name: "Apple", emoji: "🍏" },
  banana: { name: "Banana", emoji: "🍌" },
  grapes: { name: "Grapes", emoji: "🍇" },
  lemon: { name: "Lemon", emoji: "🍋" },
  strawberry: { name: "Strawberry", emoji: "🍓" },
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
    const basket = localStorage.getItem("basket");
    if (!basket) return [];
    const parsed = JSON.parse(basket);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing basket from localStorage:", error);
    return [];
  }
}

function addToBasket(product) {
  const basket = getBasket();
  // Prevent strawberries and bananas being combined
  const hasBanana = basket.includes("banana");
  const hasStrawberry = basket.includes("strawberry");
  const hasGrapes = basket.includes("grapes");
  if (product === "strawberry" && hasBanana) {
    showError("Strawberries and bananas cannot be combined.");
    return;
  }
  if (product === "banana" && hasStrawberry) {
    showError("Strawberries and bananas cannot be combined.");
    return;
  }
  // Prevent grapes and bananas being combined
  if (product === "grapes" && hasBanana) {
    showError("Grapes and bananas cannot be combined.");
    return;
  }
  if (product === "banana" && hasGrapes) {
    showError("Grapes and bananas cannot be combined.");
    return;
  }
  basket.push(product);
  localStorage.setItem("basket", JSON.stringify(basket));
}

function clearBasket() {
  localStorage.removeItem("basket");
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
  basket.forEach((product) => {
    const item = PRODUCTS[product];
    if (item) {
      const li = document.createElement("li");
      li.innerHTML = `<span class='basket-emoji'>${item.emoji}</span> <span>${item.name}</span>`;
      basketList.appendChild(li);
    }
  });
  if (cartButtonsRow) cartButtonsRow.style.display = "flex";
}

function renderBasketIndicator() {
  const basket = getBasket();
  let indicator = document.querySelector(".basket-indicator");
  if (!indicator) {
    const basketLink = document.querySelector(".basket-link");
    if (!basketLink) return;
    indicator = document.createElement("span");
    indicator.className = "basket-indicator";
    basketLink.appendChild(indicator);
  }
  if (basket.length > 0) {
    indicator.textContent = basket.length;
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

// Patch basket functions to update indicator
const origAddToBasket = window.addToBasket;
window.addToBasket = function (product) {
  origAddToBasket(product);
  renderBasketIndicator();
};
const origClearBasket = window.clearBasket;
window.clearBasket = function () {
  origClearBasket();
  renderBasketIndicator();
};
