const orderCounts = document.querySelectorAll("#order-count, [data-order-count]");
const orderTotals = document.querySelectorAll("#order-total, [data-order-total]");
const orderBars = document.querySelectorAll(".order-bar, .menu-cart-bag");
const checkoutItems = document.querySelector("#checkout-items");
const checkoutTotal = document.querySelector("#checkout-total");
const orderForm = document.querySelector("#order-form");
const formMessage = document.querySelector("#form-message");
const cartStorageKey = "keerthans-home-food-cart";

function getCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(cartStorageKey));

    if (savedCart?.quantities && typeof savedCart.quantities === "object") {
      return savedCart.quantities;
    }
  } catch {
    // A malformed saved value should not prevent visitors from ordering.
  }

  return {};
}

let cart = getCart();

function getCartTotals() {
  return Object.values(cart).reduce(
    (summary, item) => ({
      items: summary.items + item.quantity,
      total: summary.total + item.quantity * item.price,
    }),
    { items: 0, total: 0 },
  );
}

function updateOrderSummary() {
  const { items, total } = getCartTotals();
  orderCounts.forEach((orderCount) => {
    orderCount.textContent = `${items} ${items === 1 ? "item" : "items"}`;
  });

  orderTotals.forEach((orderTotal) => {
    orderTotal.textContent = `Rs. ${total}`;
  });

  orderBars.forEach((orderBar) => {
    orderBar.setAttribute(
      "aria-label",
      `Your order: ${items} ${items === 1 ? "item" : "items"}, total ${total} rupees`,
    );
  });

  if (checkoutItems) {
    const cartEntries = Object.entries(cart);
    checkoutItems.innerHTML = cartEntries.length
      ? cartEntries.map(([name, item]) => `<li><span>${name} <small>&times; ${item.quantity}</small></span><strong>Rs. ${item.price * item.quantity}</strong></li>`).join("")
      : "<li>Your cart is empty. Add a dish from the menu above.</li>";
  }

  if (checkoutTotal) checkoutTotal.textContent = `Rs. ${total}`;
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify({ quantities: cart }));
  } catch {
    // Browsing in private mode can block storage; the current-page cart still works.
  }
}

updateOrderSummary();

function renderCartControls(button) {
  const card = button.closest(".food-card");
  const dishName = card?.querySelector("h3")?.textContent.trim();
  const price = Number(button.dataset.price);
  if (!dishName || !Number.isFinite(price) || price < 0) return;

  const cartKey = dishName;
  const quantity = cart[cartKey]?.quantity || 0;
  button.classList.toggle("quantity-control", quantity > 0);

  if (!quantity) {
    button.innerHTML = 'Add to cart <span aria-hidden="true">+</span>';
    button.setAttribute("aria-label", `Add ${dishName} to cart`);
    return;
  }

  button.innerHTML = `<span class="quantity-label">Quantity</span><span class="quantity-actions"><span class="quantity-button" data-change="-1" role="button" tabindex="0" aria-label="Remove one ${dishName}">&minus;</span><strong>${quantity}</strong><span class="quantity-button" data-change="1" role="button" tabindex="0" aria-label="Add one more ${dishName}">+</span></span>`;
  button.setAttribute("aria-label", `${dishName}: ${quantity} in cart`);
}

function changeQuantity(button, change) {
  const card = button.closest(".food-card");
  const dishName = card?.querySelector("h3")?.textContent.trim();
  const price = Number(button.dataset.price);
  if (!dishName || !Number.isFinite(price) || price < 0) return;

  const cartKey = dishName;
  const nextQuantity = (cart[cartKey]?.quantity || 0) + change;
  if (nextQuantity <= 0) {
    delete cart[cartKey];
  } else {
    cart[cartKey] = { price, quantity: nextQuantity };
  }

  saveCart();
  updateOrderSummary();
  renderCartControls(button);
}

document.querySelectorAll(".add-item").forEach((button) => {
  renderCartControls(button);
  button.addEventListener("click", (event) => {
    const quantityButton = event.target.closest(".quantity-button");
    changeQuantity(button, Number(quantityButton?.dataset.change || 1));
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const quantityButton = event.target.closest(".quantity-button");
    if (!quantityButton) return;
    event.preventDefault();
    changeQuantity(button, Number(quantityButton.dataset.change));
  });
});

const dishSearch = document.querySelector("#dish-search");
const searchForm = document.querySelector(".menu-search");
const searchStatus = document.querySelector("#search-status");
const noSearchResults = document.querySelector(".no-search-results");
const menuSubsection = document.querySelector(".menu-subsection");
const foodCards = [...document.querySelectorAll(".food-card")];

function filterMenu() {
  if (!dishSearch) return;

  const query = dishSearch.value.trim().toLocaleLowerCase();
  let matches = 0;

  foodCards.forEach((card) => {
    const isMatch = !query || card.textContent.toLocaleLowerCase().includes(query) || card.querySelector("img")?.alt.toLocaleLowerCase().includes(query);
    card.hidden = !isMatch;
    if (isMatch) matches += 1;
  });

  const mocktailCards = menuSubsection?.querySelectorAll(".food-card");
  if (menuSubsection && mocktailCards) {
    menuSubsection.hidden = [...mocktailCards].every((card) => card.hidden);
  }

  if (searchStatus) {
    searchStatus.textContent = query
      ? `${matches} ${matches === 1 ? "dish" : "dishes"} found for “${dishSearch.value.trim()}”`
      : "Showing all dishes";
  }

  if (noSearchResults) noSearchResults.hidden = matches !== 0;
}

if (dishSearch) {
  dishSearch.addEventListener("input", filterMenu);
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    filterMenu();
  });
}

orderForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const { items } = getCartTotals();

  if (!items) {
    if (formMessage) formMessage.textContent = "Please add at least one dish to your cart before placing your order.";
    return;
  }

  if (!orderForm.checkValidity()) {
    orderForm.reportValidity();
    return;
  }

  const formData = new FormData(orderForm);
  const customerName = formData.get("name");
  const instructions = formData.get("special-instructions")?.trim();
  if (formMessage) formMessage.textContent = instructions
    ? `Thank you, ${customerName}! Your order is ready, including your special instruction.`
    : `Thank you, ${customerName}! Your order is ready to be sent to Keekos Home Food.`;
});
