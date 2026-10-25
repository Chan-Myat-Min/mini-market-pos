import * as storage from "./storage.js";
import * as products from "./products.js";
import * as settings from "./settings.js";

export function getCart() {
  return storage.getCart();
}

function persist(cart) {
  storage.saveCart(cart);
  return cart;
}

export function lineFor(productId) {
  return getCart().items.find((i) => i.productId === productId);
}

export function add(productId, qty) {
  const product = products.getById(productId);
  if (!product) return { ok: false, errors: ["Product not found."] };
  const addQty = Math.max(1, parseInt(qty, 10) || 1);
  const cart = getCart();
  const existing = cart.items.find((i) => i.productId === productId);
  const nextQty = (existing ? existing.qty : 0) + addQty;
  if (nextQty > product.stock) {
    return { ok: false, errors: ["Only " + product.stock + " in stock for " + product.name + "."] };
  }
  if (existing) existing.qty = nextQty;
  else cart.items.push({ productId, qty: addQty });
  persist(cart);
  return { ok: true, cart };
}

export function setQty(productId, qty) {
  const product = products.getById(productId);
  if (!product) return { ok: false, errors: ["Product not found."] };
  const next = parseInt(qty, 10);
  if (!Number.isFinite(next) || next < 1) {
    return remove(productId);
  }
  if (next > product.stock) {
    return { ok: false, errors: ["Only " + product.stock + " in stock."] };
  }
  const cart = getCart();
  const line = cart.items.find((i) => i.productId === productId);
  if (!line) return { ok: false, errors: ["Item is not in the cart."] };
  line.qty = next;
  persist(cart);
  return { ok: true, cart };
}

export function remove(productId) {
  const cart = getCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);
  persist(cart);
  return { ok: true, cart };
}

export function clear() {
  persist(storage.defaultCart());
}

export function setDiscountCents(cents) {
  const cart = getCart();
  cart.discountCents = Math.max(0, Math.round(Number(cents) || 0));
  persist(cart);
}

export function setPayment(method, amountReceivedCents) {
  const cart = getCart();
  cart.paymentMethod = method;
  if (amountReceivedCents != null) {
    cart.amountReceivedCents = Math.max(0, Math.round(Number(amountReceivedCents) || 0));
  }
  persist(cart);
}

export function setCustomer(customerId) {
  const cart = getCart();
  cart.customerId = customerId || "";
  persist(cart);
}

export function hydratedItems() {
  return getCart()
    .items.map((line) => {
      const product = products.getById(line.productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        qty: line.qty,
        unit: product.unit,
        unitPriceCents: product.sellingPriceCents,
        costPriceCents: product.costPriceCents,
        lineTotalCents: product.sellingPriceCents * line.qty,
        stock: product.stock,
      };
    })
    .filter(Boolean);
}

export function totals() {
  const cart = getCart();
  const items = hydratedItems();
  const subtotal = items.reduce((sum, i) => sum + i.lineTotalCents, 0);
  const discount = Math.min(cart.discountCents || 0, subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * settings.taxRate());
  const grandTotal = taxable + tax;
  const method = cart.paymentMethod || "cash";
  const received = method === "cash" ? cart.amountReceivedCents || 0 : grandTotal;
  return {
    items,
    subtotalCents: subtotal,
    discountCents: discount,
    taxCents: tax,
    grandTotalCents: grandTotal,
    amountReceivedCents: received,
    changeCents: received - grandTotal,
    paymentMethod: method,
    empty: items.length === 0,
  };
}
